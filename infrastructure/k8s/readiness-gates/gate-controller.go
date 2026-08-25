package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/watch"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

type HealthCheck struct {
	Type     string `json:"type"`
	Name     string `json:"name"`
	Endpoint string `json:"endpoint"`
	Timeout  string `json:"timeout"`
}

type GateCondition struct {
	Type               string `json:"type"`
	Status             string `json:"status"`
	Reason             string `json:"reason"`
	Message            string `json:"message"`
	LastTransitionTime string `json:"lastTransitionTime"`
}

type ReadinessGateConfig struct {
	HealthChecks []HealthCheck `json:"healthChecks"`
	Timeout      string        `json:"timeout"`
}

type GateController struct {
	clientset       kubernetes.Interface
	namespace       string
	config          ReadinessGateConfig
	conditionCache  map[string][]GateCondition
	mu              sync.RWMutex
}

func NewGateController(clientset kubernetes.Interface, namespace string, config ReadinessGateConfig) *GateController {
	return &GateController{
		clientset:      clientset,
		namespace:      namespace,
		config:         config,
		conditionCache: make(map[string][]GateCondition),
	}
}

func (gc *GateController) checkHealth(checkType string) bool {
	client := &http.Client{Timeout: 10 * time.Second}

	var url string
	switch checkType {
	case "database":
		url = "http://gistpin-postgres.gistpin.svc.cluster.local:5432/health"
	case "cache":
		url = "http://gistpin-redis.gistpin.svc.cluster.local:6379/ping"
	case "backendAPI":
		url = "http://backend-service.gistpin.svc.cluster.local:3000/health"
	default:
		return false
	}

	resp, err := client.Get(url)
	if err != nil {
		log.Printf("Health check failed for %s: %v", checkType, err)
		return false
	}
	defer resp.Body.Close()

	return resp.StatusCode == http.StatusOK
}

func (gc *GateController) evaluateConditions() []GateCondition {
	var conditions []GateCondition

	dbHealthy := gc.checkHealth("database")
	cacheHealthy := gc.checkHealth("cache")
	apiHealthy := gc.checkHealth("backendAPI")

	now := time.Now().UTC().Format(time.RFC3339)

	conditions = append(conditions, GateCondition{
		Type:               "DatabaseReady",
		Status:             boolToStatus(dbHealthy),
		Reason:             boolToReason(dbHealthy, "DatabaseConnectionHealthy", "DatabaseConnectionFailed"),
		Message:            boolToMessage(dbHealthy, "PostgreSQL connection pool is healthy", "PostgreSQL connection failed"),
		LastTransitionTime: now,
	})

	conditions = append(conditions, GateCondition{
		Type:               "CacheReady",
		Status:             boolToStatus(cacheHealthy),
		Reason:             boolToReason(cacheHealthy, "RedisConnected", "RedisDisconnected"),
		Message:            boolToMessage(cacheHealthy, "Redis cache connection is established", "Redis connection failed"),
		LastTransitionTime: now,
	})

	conditions = append(conditions, GateCondition{
		Type:               "ExternalDependenciesReady",
		Status:             boolToStatus(apiHealthy),
		Reason:             boolToReason(apiHealthy, "AllDependenciesAvailable", "DependenciesUnavailable"),
		Message:            boolToMessage(apiHealthy, "All external service dependencies are reachable", "External dependencies unreachable"),
		LastTransitionTime: now,
	})

	return conditions
}

func boolToStatus(b bool) string {
	if b {
		return "True"
	}
	return "False"
}

func boolToReason(b bool, trueReason, falseReason string) string {
	if b {
		return trueReason
	}
	return falseReason
}

func boolToMessage(b bool, trueMsg, falseMsg string) string {
	if b {
		return trueMsg
	}
	return falseMsg
}

func (gc *GateController) updateConditions(conditions []GateCondition) {
	gc.mu.Lock()
	defer gc.mu.Unlock()

	for _, cond := range conditions {
		gc.conditionCache[cond.Type] = []GateCondition{cond}
	}

	log.Printf("Updated conditions: %+v", conditions)
}

func (gc *GateController) Start(ctx context.Context) {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	log.Println("Gate controller started, checking health every 10 seconds")

	for {
		select {
		case <-ctx.Done():
			log.Println("Gate controller shutting down")
			return
		case <-ticker.C:
			conditions := gc.evaluateConditions()
			gc.updateConditions(conditions)
		}
	}
}

func (gc *GateController) handleStatus(w http.ResponseWriter, r *http.Request) {
	gc.mu.RLock()
	defer gc.mu.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(gc.conditionCache)
}

func main() {
	log.Println("Starting readiness gate controller...")

	var config *rest.Config
	var err error

	kubeconfig := os.Getenv("KUBECONFIG")
	if kubeconfig != "" {
		config, err = clientcmd.BuildConfigFromFlags("", kubeconfig)
	} else {
		config, err = rest.InClusterConfig()
	}
	if err != nil {
		log.Fatalf("Failed to get kubeconfig: %v", err)
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		log.Fatalf("Failed to create clientset: %v", err)
	}

	namespace := os.Getenv("NAMESPACE")
	if namespace == "" {
		namespace = "gistpin"
	}

	gateConfig := ReadinessGateConfig{
		Timeout: "300s",
	}

	controller := NewGateController(clientset, namespace, gateConfig)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go controller.Start(ctx)

	http.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, "ok")
	})

	http.HandleFunc("/status", controller.handleStatus)

	server := &http.Server{
		Addr:    ":8080",
		Handler: nil,
	}

	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("HTTP server error: %v", err)
		}
	}()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan

	log.Println("Received shutdown signal")
	cancel()

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer shutdownCancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("Server shutdown error: %v", err)
	}

	log.Println("Gate controller stopped")
}
