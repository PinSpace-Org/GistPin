package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"

	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/kubernetes/pkg/scheduler/framework"
)

// GeoSchedulerPlugin routes pods to nodes in the preferred geographic region.
type GeoSchedulerPlugin struct{}

const Name = "GeoScheduler"

func (g *GeoSchedulerPlugin) Name() string { return Name }

// Filter excludes nodes that don't match the pod's geo-affinity label.
func (g *GeoSchedulerPlugin) Filter(ctx context.Context, state *framework.CycleState, pod *v1.Pod, nodeInfo *framework.NodeInfo) *framework.Status {
	requiredRegion, ok := pod.Annotations["gistpin.io/preferred-region"]
	if !ok {
		return nil // no preference — allow any node
	}

	nodeRegion, exists := nodeInfo.Node().Labels["topology.kubernetes.io/region"]
	if !exists {
		return framework.NewStatus(framework.Unschedulable, "node missing topology.kubernetes.io/region label")
	}

	if nodeRegion != requiredRegion {
		return framework.NewStatus(framework.Unschedulable,
			fmt.Sprintf("node region %q does not match required region %q", nodeRegion, requiredRegion))
	}

	return nil
}

// Score prefers nodes in the pod's preferred region (soft preference).
func (g *GeoSchedulerPlugin) Score(ctx context.Context, state *framework.CycleState, pod *v1.Pod, nodeName string) (int64, *framework.Status) {
	preferredRegion, ok := pod.Annotations["gistpin.io/preferred-region"]
	if !ok {
		return 50, nil // neutral score — no preference
	}
	_ = preferredRegion
	// Hard filter already handled; give max score to passing nodes.
	return framework.MaxNodeScore, nil
}

func (g *GeoSchedulerPlugin) ScoreExtensions() framework.ScoreExtensions { return nil }

// New creates a new GeoSchedulerPlugin instance.
func New(_ runtime.Object, _ framework.Handle) (framework.Plugin, error) {
	return &GeoSchedulerPlugin{}, nil
}

func main() {
	cfg := map[string]interface{}{
		"plugin": Name,
		"status": "GeoScheduler plugin loaded",
	}
	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	if err := enc.Encode(cfg); err != nil {
		log.Fatal(err)
	}
}
