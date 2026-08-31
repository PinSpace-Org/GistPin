package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"sync"
	"time"

	admissionv1 "k8s.io/api/admission/v1"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/yaml"
)

// policy is loaded at startup from POLICY_PATH.
var policy VulnPolicy

// scanCache memoizes Trivy results per image reference so repeated admissions of
// the same image (e.g. a rolling update) don't re-scan. Entries expire after
// policy.CacheTTLMinutes.
var scanCache = newCache()

// VulnPolicy defines how image scan findings gate admission. See vuln-policy.yaml.
type VulnPolicy struct {
	// BlockOnCritical rejects admission when a container image has any CVE at or
	// above the critical severity threshold.
	BlockOnCritical bool `yaml:"blockOnCritical"`
	// WarnOnHigh allows admission but annotates the workload when high CVEs exist.
	WarnOnHigh bool `yaml:"warnOnHigh"`
	// ApprovedImages are exact image references (with tag or digest) that bypass
	// scanning entirely — e.g. a vendor image with an accepted, tracked risk.
	ApprovedImages []string `yaml:"approvedImages"`
	// IgnoreCVEs are individual CVE IDs accepted platform-wide (with a tracked
	// exception), excluded from the critical/high counts.
	IgnoreCVEs []string `yaml:"ignoreCVEs"`
	// CacheTTLMinutes controls how long a scan result is reused.
	CacheTTLMinutes int `yaml:"cacheTTLMinutes"`
	// TrivyServerURL, when set, points the scanner at a central Trivy server so
	// the vulnerability DB is shared rather than downloaded per invocation.
	TrivyServerURL string `yaml:"trivyServerURL"`
}

// scanResult is the subset of Trivy JSON output this webhook needs.
type scanResult struct {
	Critical []string
	High     []string
}

type cacheEntry struct {
	result    scanResult
	expiresAt time.Time
}

type cache struct {
	mu      sync.Mutex
	entries map[string]cacheEntry
}

func newCache() *cache { return &cache{entries: make(map[string]cacheEntry)} }

func (c *cache) get(key string) (scanResult, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	e, ok := c.entries[key]
	if !ok || time.Now().After(e.expiresAt) {
		return scanResult{}, false
	}
	return e.result, true
}

func (c *cache) set(key string, r scanResult, ttl time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.entries[key] = cacheEntry{result: r, expiresAt: time.Now().Add(ttl)}
}

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	policyPath := os.Getenv("POLICY_PATH")
	if policyPath == "" {
		policyPath = "/policy/vuln-policy.yaml"
	}
	data, err := os.ReadFile(policyPath)
	if err != nil {
		logger.Error("failed to load vuln policy", "error", err)
		os.Exit(1)
	}
	if err := yaml.Unmarshal(data, &policy); err != nil {
		logger.Error("failed to parse vuln policy", "error", err)
		os.Exit(1)
	}
	if policy.CacheTTLMinutes == 0 {
		policy.CacheTTLMinutes = 60
	}
	logger.Info("vuln policy loaded", "path", policyPath,
		"blockOnCritical", policy.BlockOnCritical, "cacheTTLMinutes", policy.CacheTTLMinutes)

	mux := http.NewServeMux()
	mux.HandleFunc("/validate", handleValidate(logger))
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) })
	mux.HandleFunc("/readyz", func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) })

	server := &http.Server{Addr: ":8443", Handler: mux}
	logger.Info("image vulnerability blocker listening", "addr", server.Addr)
	if err := server.ListenAndServeTLS("/tls/tls.crt", "/tls/tls.key"); err != nil {
		logger.Error("server error", "error", err)
		os.Exit(1)
	}
}

// handleValidate scans every container image on the incoming workload and blocks
// admission when the configured policy is violated.
func handleValidate(logger *slog.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		review, err := parseAdmissionReview(r)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		images := extractImages(review.Request)
		var blockReasons []string
		var warnReasons []string

		for _, image := range images {
			if isApproved(image) {
				logger.Info("image approved via exception", "image", image)
				continue
			}
			result, err := scanImage(image)
			if err != nil {
				// Fail closed on critical enforcement: an unscannable image is
				// treated as a block when BlockOnCritical is set, so a broken
				// scanner can't become a bypass.
				logger.Error("scan failed", "image", image, "error", err)
				if policy.BlockOnCritical {
					blockReasons = append(blockReasons, fmt.Sprintf("%s: scan failed (%v)", image, err))
				}
				continue
			}
			if policy.BlockOnCritical && len(result.Critical) > 0 {
				blockReasons = append(blockReasons,
					fmt.Sprintf("%s: %d critical CVE(s): %s", image, len(result.Critical), strings.Join(result.Critical, ", ")))
			}
			if policy.WarnOnHigh && len(result.High) > 0 {
				warnReasons = append(warnReasons,
					fmt.Sprintf("%s: %d high CVE(s)", image, len(result.High)))
			}
		}

		allowed := len(blockReasons) == 0
		status := &metav1.Status{Status: "Success"}
		if !allowed {
			status.Status = "Failure"
			status.Message = "image vulnerability policy violation: " + strings.Join(blockReasons, "; ")
			status.Code = http.StatusForbidden
			logger.Warn("admission denied for vulnerable images",
				"reasons", blockReasons, "resource", review.Request.Name, "namespace", review.Request.Namespace)
		} else if len(warnReasons) > 0 {
			logger.Warn("high-severity CVEs present (allowed)", "warnings", warnReasons,
				"resource", review.Request.Name, "namespace", review.Request.Namespace)
		}

		writeResponse(w, review.Request.UID, allowed, status, warnReasons)
	}
}

// extractImages pulls the container image references from a Pod or Deployment.
func extractImages(req *admissionv1.AdmissionRequest) []string {
	var containers []corev1.Container
	switch req.Kind.Kind {
	case "Deployment":
		var dep appsv1.Deployment
		if err := json.Unmarshal(req.Object.Raw, &dep); err == nil {
			containers = append(dep.Spec.Template.Spec.InitContainers, dep.Spec.Template.Spec.Containers...)
		}
	case "Pod":
		var pod corev1.Pod
		if err := json.Unmarshal(req.Object.Raw, &pod); err == nil {
			containers = append(pod.Spec.InitContainers, pod.Spec.Containers...)
		}
	}
	seen := make(map[string]struct{})
	var images []string
	for _, c := range containers {
		if c.Image == "" {
			continue
		}
		if _, ok := seen[c.Image]; ok {
			continue
		}
		seen[c.Image] = struct{}{}
		images = append(images, c.Image)
	}
	return images
}

// scanImage returns the critical/high CVE lists for an image, using the cache
// when a fresh result is available.
func scanImage(image string) (scanResult, error) {
	key := cacheKey(image)
	if cached, ok := scanCache.get(key); ok {
		return cached, nil
	}
	result, err := runTrivy(image)
	if err != nil {
		return scanResult{}, err
	}
	scanCache.set(key, result, time.Duration(policy.CacheTTLMinutes)*time.Minute)
	return result, nil
}

// runTrivy shells out to the Trivy CLI and parses its JSON output. A central
// Trivy server (policy.TrivyServerURL) is used when configured so the vuln DB
// isn't re-downloaded on every scan.
func runTrivy(image string) (scanResult, error) {
	args := []string{"image", "--quiet", "--format", "json", "--severity", "HIGH,CRITICAL"}
	if policy.TrivyServerURL != "" {
		args = append(args, "--server", policy.TrivyServerURL)
	}
	args = append(args, image)

	out, err := exec.Command("trivy", args...).Output()
	if err != nil {
		return scanResult{}, fmt.Errorf("trivy execution failed: %w", err)
	}

	var report struct {
		Results []struct {
			Vulnerabilities []struct {
				VulnerabilityID string `json:"VulnerabilityID"`
				Severity        string `json:"Severity"`
			} `json:"Vulnerabilities"`
		} `json:"Results"`
	}
	if err := json.Unmarshal(out, &report); err != nil {
		return scanResult{}, fmt.Errorf("failed to parse trivy output: %w", err)
	}

	ignored := make(map[string]struct{}, len(policy.IgnoreCVEs))
	for _, id := range policy.IgnoreCVEs {
		ignored[id] = struct{}{}
	}

	var result scanResult
	for _, r := range report.Results {
		for _, v := range r.Vulnerabilities {
			if _, skip := ignored[v.VulnerabilityID]; skip {
				continue
			}
			switch v.Severity {
			case "CRITICAL":
				result.Critical = append(result.Critical, v.VulnerabilityID)
			case "HIGH":
				result.High = append(result.High, v.VulnerabilityID)
			}
		}
	}
	return result, nil
}

func isApproved(image string) bool {
	for _, approved := range policy.ApprovedImages {
		if image == approved {
			return true
		}
	}
	return false
}

func cacheKey(image string) string {
	sum := sha256.Sum256([]byte(image))
	return hex.EncodeToString(sum[:])
}

func parseAdmissionReview(r *http.Request) (*admissionv1.AdmissionReview, error) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read body: %w", err)
	}
	var review admissionv1.AdmissionReview
	if err := json.Unmarshal(body, &review); err != nil {
		return nil, fmt.Errorf("failed to unmarshal admission review: %w", err)
	}
	if review.Request == nil {
		return nil, fmt.Errorf("admission review has no request")
	}
	return &review, nil
}

// writeResponse emits the AdmissionReview response, attaching any high-severity
// warnings so kubectl surfaces them to the applying user without blocking.
func writeResponse(w http.ResponseWriter, uid types.UID, allowed bool, status *metav1.Status, warnings []string) {
	response := admissionv1.AdmissionReview{
		TypeMeta: metav1.TypeMeta{Kind: "AdmissionReview", APIVersion: "admission.k8s.io/v1"},
		Response: &admissionv1.AdmissionResponse{
			UID:      uid,
			Allowed:  allowed,
			Result:   status,
			Warnings: warnings,
		},
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(response)
}
