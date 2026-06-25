package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"

	admissionv1 "k8s.io/api/admission/v1"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/yaml"
)

// Policies loaded at startup from POLICIES_PATH env var.
var policies Policies

// Policies defines the enforcement rules.
type Policies struct {
	RequireResourceLimits   bool     `yaml:"requireResourceLimits"`
	RequireReadOnlyRootFS   bool     `yaml:"requireReadOnlyRootFS"`
	RequireNonRootUser      bool     `yaml:"requireNonRootUser"`
	DisallowPrivileged      bool     `yaml:"disallowPrivileged"`
	DisallowHostNetwork     bool     `yaml:"disallowHostNetwork"`
	AllowedRegistries       []string `yaml:"allowedRegistries"`
	RequireLabels           []string `yaml:"requireLabels"`
	InjectSeccompAnnotation bool     `yaml:"injectSeccompAnnotation"`
}

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	// Load policies
	policiesPath := os.Getenv("POLICIES_PATH")
	if policiesPath == "" {
		policiesPath = "/policies/policies.yaml"
	}
	data, err := os.ReadFile(policiesPath)
	if err != nil {
		logger.Error("failed to load policies", "error", err)
		os.Exit(1)
	}
	if err := yaml.Unmarshal(data, &policies); err != nil {
		logger.Error("failed to parse policies", "error", err)
		os.Exit(1)
	}
	logger.Info("policies loaded", "path", policiesPath)

	mux := http.NewServeMux()
	mux.HandleFunc("/validate", handleValidate(logger))
	mux.HandleFunc("/mutate", handleMutate(logger))
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) })
	mux.HandleFunc("/readyz", func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) })

	server := &http.Server{
		Addr:    ":8443",
		Handler: mux,
	}

	tlsCert := "/tls/tls.crt"
	tlsKey := "/tls/tls.key"
	logger.Info("admission controller listening", "addr", server.Addr)
	if err := server.ListenAndServeTLS(tlsCert, tlsKey); err != nil {
		logger.Error("server error", "error", err)
		os.Exit(1)
	}
}

// handleValidate enforces policies and rejects non-compliant workloads.
func handleValidate(logger *slog.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		review, err := parseAdmissionReview(r)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		var violations []string
		var pods []corev1.Container

		switch review.Request.Kind.Kind {
		case "Deployment":
			var dep appsv1.Deployment
			if err := json.Unmarshal(review.Request.Object.Raw, &dep); err == nil {
				pods = dep.Spec.Template.Spec.Containers
				violations = append(violations, checkLabels(dep.Labels)...)
			}
		case "Pod":
			var pod corev1.Pod
			if err := json.Unmarshal(review.Request.Object.Raw, &pod); err == nil {
				pods = pod.Spec.Containers
				violations = append(violations, checkLabels(pod.Labels)...)
				if policies.DisallowHostNetwork && pod.Spec.HostNetwork {
					violations = append(violations, "hostNetwork is not allowed")
				}
			}
		}

		for _, c := range pods {
			violations = append(violations, validateContainer(c)...)
		}

		allowed := len(violations) == 0
		status := &metav1.Status{Status: "Success"}
		if !allowed {
			status.Status = "Failure"
			status.Message = fmt.Sprintf("policy violations: %v", violations)
			status.Code = http.StatusForbidden
			logger.Warn("admission denied", "violations", violations,
				"resource", review.Request.Name, "namespace", review.Request.Namespace)
		}

		auditLog(logger, review, allowed, violations)
		writeResponse(w, review.Request.UID, allowed, status)
	}
}

// handleMutate injects default labels and seccomp annotation.
func handleMutate(logger *slog.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		review, err := parseAdmissionReview(r)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		var patches []map[string]interface{}

		if policies.InjectSeccompAnnotation {
			patches = append(patches, map[string]interface{}{
				"op":    "add",
				"path":  "/metadata/annotations/seccomp.security.alpha.kubernetes.io~1pod",
				"value": "runtime/default",
			})
		}

		patchBytes, _ := json.Marshal(patches)
		patchType := admissionv1.PatchTypeJSONPatch
		resp := &admissionv1.AdmissionResponse{
			UID:       review.Request.UID,
			Allowed:   true,
			Patch:     patchBytes,
			PatchType: &patchType,
		}
		if len(patches) == 0 {
			resp.Patch = nil
			resp.PatchType = nil
		}

		logger.Info("mutating admission", "resource", review.Request.Name,
			"namespace", review.Request.Namespace, "patches", len(patches))

		out := admissionv1.AdmissionReview{
			TypeMeta: metav1.TypeMeta{APIVersion: "admission.k8s.io/v1", Kind: "AdmissionReview"},
			Response: resp,
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(out) //nolint:errcheck
	}
}

// validateContainer checks a single container against active policies.
func validateContainer(c corev1.Container) []string {
	var v []string

	if policies.RequireResourceLimits {
		if c.Resources.Limits == nil || c.Resources.Limits.Cpu().IsZero() {
			v = append(v, fmt.Sprintf("container %q missing CPU limit", c.Name))
		}
		if c.Resources.Limits == nil || c.Resources.Limits.Memory().IsZero() {
			v = append(v, fmt.Sprintf("container %q missing memory limit", c.Name))
		}
	}

	if c.SecurityContext != nil {
		if policies.DisallowPrivileged && c.SecurityContext.Privileged != nil && *c.SecurityContext.Privileged {
			v = append(v, fmt.Sprintf("container %q must not be privileged", c.Name))
		}
		if policies.RequireNonRootUser && c.SecurityContext.RunAsNonRoot != nil && !*c.SecurityContext.RunAsNonRoot {
			v = append(v, fmt.Sprintf("container %q must run as non-root", c.Name))
		}
		if policies.RequireReadOnlyRootFS && (c.SecurityContext.ReadOnlyRootFilesystem == nil || !*c.SecurityContext.ReadOnlyRootFilesystem) {
			v = append(v, fmt.Sprintf("container %q must have readOnlyRootFilesystem", c.Name))
		}
	} else {
		if policies.RequireNonRootUser {
			v = append(v, fmt.Sprintf("container %q missing securityContext (runAsNonRoot required)", c.Name))
		}
	}

	if len(policies.AllowedRegistries) > 0 {
		if !imageFromAllowedRegistry(c.Image, policies.AllowedRegistries) {
			v = append(v, fmt.Sprintf("container %q uses disallowed image registry: %s", c.Name, c.Image))
		}
	}

	return v
}

func checkLabels(labels map[string]string) []string {
	var v []string
	for _, req := range policies.RequireLabels {
		if _, ok := labels[req]; !ok {
			v = append(v, fmt.Sprintf("missing required label: %s", req))
		}
	}
	return v
}

func imageFromAllowedRegistry(image string, allowed []string) bool {
	for _, reg := range allowed {
		if len(image) >= len(reg) && image[:len(reg)] == reg {
			return true
		}
	}
	return false
}

func parseAdmissionReview(r *http.Request) (*admissionv1.AdmissionReview, error) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		return nil, err
	}
	var review admissionv1.AdmissionReview
	if err := json.Unmarshal(body, &review); err != nil {
		return nil, err
	}
	return &review, nil
}

func writeResponse(w http.ResponseWriter, uid admissionv1.UID, allowed bool, status *metav1.Status) {
	resp := admissionv1.AdmissionReview{
		TypeMeta: metav1.TypeMeta{APIVersion: "admission.k8s.io/v1", Kind: "AdmissionReview"},
		Response: &admissionv1.AdmissionResponse{
			UID:     uid,
			Allowed: allowed,
			Result:  status,
		},
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp) //nolint:errcheck
}

func auditLog(logger *slog.Logger, review *admissionv1.AdmissionReview, allowed bool, violations []string) {
	logger.Info("admission audit",
		"uid", review.Request.UID,
		"kind", review.Request.Kind.Kind,
		"name", review.Request.Name,
		"namespace", review.Request.Namespace,
		"operation", review.Request.Operation,
		"user", review.Request.UserInfo.Username,
		"allowed", allowed,
		"violations", violations,
	)
}
