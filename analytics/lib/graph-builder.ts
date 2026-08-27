export interface GraphNode {
  id: string;
  label: string;
  type: 'user' | 'gist' | 'topic';
  activityLevel: number;
  reactionCount: number;
  cluster: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  type: 'reacted' | 'authored' | 'shared_topic';
}

export interface GraphCluster {
  id: number;
  label: string;
  nodeCount: number;
  avgActivity: number;
  color: string;
}

const CLUSTER_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'];
const CLUSTER_NAMES = ['DeFi Builders', 'Web3 Frontend', 'Smart Contract Devs', 'Tooling & Infra', 'Community Contributors', 'Research & Analysis'];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateGraphData(): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const rand = seededRandom(42);
  const nodeCount = 40;
  const clusterCount = 6;

  const nodes: GraphNode[] = Array.from({ length: nodeCount }, (_, i) => {
    const cluster = Math.floor(rand() * clusterCount);
    const angle = (2 * Math.PI * cluster) / clusterCount + (rand() - 0.5) * 0.8;
    const radius = 120 + rand() * 100;
    return {
      id: i < 20 ? `user-${i}` : `gist-${i - 20}`,
      label: i < 20 ? `User ${(i + 1).toString().padStart(2, '0')}` : `Gist ${(i - 19).toString().padStart(2, '0')}`,
      type: i < 20 ? 'user' : 'gist',
      activityLevel: Math.round(20 + rand() * 80),
      reactionCount: Math.round(1 + rand() * 50),
      cluster,
      x: 250 + Math.cos(angle) * radius,
      y: 250 + Math.sin(angle) * radius,
      vx: 0,
      vy: 0,
    };
  });

  const edges: GraphEdge[] = [];
  nodes.forEach((node, i) => {
    const edgesToCreate = 1 + Math.floor(rand() * 3);
    for (let e = 0; e < edgesToCreate; e++) {
      let j = Math.floor(rand() * nodeCount);
      if (j === i) j = (i + 1) % nodeCount;
      const exists = edges.some(
        (ed) => (ed.source === node.id && ed.target === nodes[j].id) || (ed.source === nodes[j].id && ed.target === node.id)
      );
      if (!exists) {
        edges.push({
          source: node.id,
          target: nodes[j].id,
          weight: Math.round(1 + rand() * 10),
          type: rand() > 0.5 ? 'reacted' : rand() > 0.5 ? 'authored' : 'shared_topic',
        });
      }
    }
  });

  return { nodes, edges };
}

export function getClusters(nodes: GraphNode[]): GraphCluster[] {
  const clusterMap = new Map<number, GraphNode[]>();
  nodes.forEach((n) => {
    if (!clusterMap.has(n.cluster)) clusterMap.set(n.cluster, []);
    clusterMap.get(n.cluster)!.push(n);
  });

  return Array.from(clusterMap.entries()).map(([id, clusterNodes]) => ({
    id,
    label: CLUSTER_NAMES[id] || `Cluster ${id}`,
    nodeCount: clusterNodes.length,
    avgActivity: Math.round(clusterNodes.reduce((s, n) => s + n.activityLevel, 0) / clusterNodes.length),
    color: CLUSTER_COLORS[id % CLUSTER_COLORS.length],
  }));
}

export function simulateForce(nodes: GraphNode[], edges: GraphEdge[], iterations: number): GraphNode[] {
  const result = nodes.map((n) => ({ ...n }));
  const nodeMap = new Map(result.map((n) => [n.id, n]));

  for (let iter = 0; iter < iterations; iter++) {
    const k = 0.01;
    result.forEach((a) => {
      result.forEach((b) => {
        if (a.id === b.id) return;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const repulsion = (k * 1000) / (dist * dist);
        a.vx -= (dx / dist) * repulsion;
        a.vy -= (dy / dist) * repulsion;
      });
    });

    edges.forEach((edge) => {
      const a = nodeMap.get(edge.source);
      const b = nodeMap.get(edge.target);
      if (!a || !b) return;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const attraction = (dist - 100) * 0.005 * edge.weight;
      a.vx += (dx / dist) * attraction;
      a.vy += (dy / dist) * attraction;
      b.vx -= (dx / dist) * attraction;
      b.vy -= (dy / dist) * attraction;
    });

    const damping = 0.9;
    result.forEach((n) => {
      n.vx *= damping;
      n.vy *= damping;
      n.x += n.vx;
      n.y += n.vy;
      n.x = Math.max(40, Math.min(460, n.x));
      n.y = Math.max(40, Math.min(460, n.y));
    });
  }

  return result;
}

export function exportGraphData(nodes: GraphNode[], edges: GraphEdge[]) {
  return JSON.stringify({ nodes, edges, generatedAt: new Date().toISOString() }, null, 2);
}
