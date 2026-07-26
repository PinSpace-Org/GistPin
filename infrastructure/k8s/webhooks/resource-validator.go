package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"

	admissionv1 "k8s.io/api/admission/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// allowedRegistries is the image registry allowlist.
var allowedRegistries = []string{
	"ghcr.io/pinspace-org/",
	"public.ecr.aws/",
	"docker.io/library/",
	"busybox",
	"curlimages/",
	"fluent/",
}

func main() {
	http.HandleFunc("/validate", validateHandler)
	http.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	log.Println("Resource validator webhook listening on :8443")
	log.Fatal(http.ListenAndServeTLS(":8443", "/tls/tls.crt", "/tls/tls.key", nil))
}

func validateHandler(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "failed to read body", http.StatusBadRequest)
		return
	}

	var review admissionv1.AdmissionReview
	if err := json.Unmarshal(body, &review); err != nil {
		http.Error(w, "failed to parse admission review", http.StatusBadRequest)
		return
	}

	response := validate(review.Request)
	review.Response = response
	review.Response.UID = review.Request.UID

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(review)
}

func validate(req *admissionv1.AdmissionRequest) *admissionv1.AdmissionResponse {
	var pod corev1.Pod
	if err := json.Unmarshal(req.Object.Raw, &pod); err != nil {
		return deny(fmt.Sprintf("failed to unmarshal pod: %v", err))
	}

	// Check all containers (init + regular)
	allContainers := append(pod.Spec.InitContainers, pod.Spec.Containers...)
	for _, c := range allContainers {
		// 1. Required labels
		if _, ok := pod.Labels["app"]; !ok {
			return deny("pod must have an 'app' label")
		}
		if _, ok := pod.Labels["environment"]; !ok {
			return deny("pod must have an 'environment' label")
		}

		// 2. Resource limits required
		if c.Resources.Limits == nil {
			return deny(fmt.Sprintf("container %q must set resource limits", c.Name))
		}
		if c.Resources.Limits.Cpu().IsZero() {
			return deny(fmt.Sprintf("container %q must set CPU limit", c.Name))
		}
		if c.Resources.Limits.Memory().IsZero() {
			return deny(fmt.Sprintf("container %q must set memory limit", c.Name))
		}

		// 3. Image registry allowlist
		allowed := false
		for _, reg := range allowedRegistries {
			if len(c.Image) >= len(reg) && c.Image[:len(reg)] == reg {
				allowed = true
				break
			}
		}
		if !allowed {
			return deny(fmt.Sprintf("container %q uses non-allowlisted registry: %s", c.Name, c.Image))
		}

		// 4. Liveness probe required
		if c.LivenessProbe == nil {
			return deny(fmt.Sprintf("container %q must define a livenessProbe", c.Name))
		}

		// 5. Non-root user enforcement
		if c.SecurityContext != nil && c.SecurityContext.RunAsUser != nil {
			if *c.SecurityContext.RunAsUser == 0 {
				return deny(fmt.Sprintf("container %q must not run as root (uid 0)", c.Name))
			}
		}
	}

	return &admissionv1.AdmissionResponse{Allowed: true}
}

func deny(reason string) *admissionv1.AdmissionResponse {
	return &admissionv1.AdmissionResponse{
		Allowed: false,
		Result: &metav1.Status{
			Message: reason,
		},
	}
}
