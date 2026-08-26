'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { generateGraphData, getClusters, simulateForce, exportGraphData } from '@/lib/graph-builder';

const CANVAS_SIZE = 500;
const NODE_MIN_R = 4;
const NODE_MAX_R = 14;

const CLUSTER_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'];

export default function SocialGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const dataRef = useRef(generateGraphData());
  const [clusters] = useState(() => getClusters(dataRef.current.nodes));

  const simNodes = useRef(simulateForce(dataRef.current.nodes, dataRef.current.edges, 120));

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    dataRef.current.edges.forEach((edge) => {
      const source = simNodes.current.find((n) => n.id === edge.source);
      const target = simNodes.current.find((n) => n.id === edge.target);
      if (!source || !target) return;

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.strokeStyle = edge.type === 'reacted' ? 'rgba(99,102,241,0.25)' : edge.type === 'authored' ? 'rgba(34,197,94,0.25)' : 'rgba(234,179,8,0.25)';
      ctx.lineWidth = Math.max(0.5, edge.weight * 0.3);
      ctx.stroke();
    });

    simNodes.current.forEach((node) => {
      const r = NODE_MIN_R + (node.activityLevel / 100) * (NODE_MAX_R - NODE_MIN_R);
      const isHovered = hoveredNode === node.id;
      const isSelected = selectedNode === node.id;

      ctx.beginPath();
      ctx.arc(node.x, node.y, r + (isHovered ? 3 : 0), 0, 2 * Math.PI);
      ctx.fillStyle = CLUSTER_COLORS[node.cluster % CLUSTER_COLORS.length] + (isSelected ? 'ff' : 'cc');
      ctx.fill();

      if (isSelected || isHovered) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 6, 0, 2 * Math.PI);
        ctx.strokeStyle = CLUSTER_COLORS[node.cluster % CLUSTER_COLORS.length];
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.fillStyle = '#111827';
      ctx.font = `${r > 8 ? 9 : 7}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(node.label, node.x, node.y + r + 12);
    });
  }, [hoveredNode, selectedNode]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleCanvasMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE;
      const my = ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE;

      const found = simNodes.current.find((n) => {
        const r = NODE_MIN_R + (n.activityLevel / 100) * (NODE_MAX_R - NODE_MIN_R);
        return Math.hypot(mx - n.x, my - n.y) < r + 4;
      });
      setHoveredNode(found?.id ?? null);
    },
    []
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE;
      const my = ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE;

      const found = simNodes.current.find((n) => {
        const r = NODE_MIN_R + (n.activityLevel / 100) * (NODE_MAX_R - NODE_MIN_R);
        return Math.hypot(mx - n.x, my - n.y) < r + 4;
      });
      setSelectedNode(found?.id ?? null);
    },
    []
  );

  const selectedNodeData = simNodes.current.find((n) => n.id === selectedNode);
  const connectedEdges = selectedNode
    ? dataRef.current.edges.filter((e) => e.source === selectedNode || e.target === selectedNode)
    : [];

  const handleExport = () => {
    const json = exportGraphData(simNodes.current, dataRef.current.edges);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'social-graph-data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ fontFamily: 'inherit' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Force-Directed Reaction Graph</h3>
            <button onClick={handleExport} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 6, border: '1px solid #6366f1', background: '#6366f1', color: '#fff', cursor: 'pointer' }}>
              Export JSON
            </button>
          </div>
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            style={{ width: '100%', height: CANVAS_SIZE, borderRadius: 12, background: '#f9fafb', border: '1px solid #e5e7eb', cursor: hoveredNode ? 'pointer' : 'default' }}
            onMouseMove={handleCanvasMove}
            onClick={handleCanvasClick}
          />
          <p style={{ margin: '8px 0 0', fontSize: 11, color: '#6b7280' }}>
            Node size = activity level · Edge width = shared reaction count · Click a node for details
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>Clusters Detected</h3>
            {clusters.map((c) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: 6, background: c.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{c.label}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{c.nodeCount} nodes · avg activity {c.avgActivity}</div>
                </div>
              </div>
            ))}
          </div>

          {selectedNodeData && (
            <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>Node Details</h3>
              <div style={{ fontSize: 13 }}>
                <p style={{ margin: '0 0 4px', fontWeight: 600 }}>{selectedNodeData.label}</p>
                <p style={{ margin: '0 0 2px', color: '#6b7280' }}>Type: {selectedNodeData.type}</p>
                <p style={{ margin: '0 0 2px', color: '#6b7280' }}>Activity: {selectedNodeData.activityLevel}/100</p>
                <p style={{ margin: '0 0 2px', color: '#6b7280' }}>Reactions: {selectedNodeData.reactionCount}</p>
                <p style={{ margin: '0 0 2px', color: '#6b7280' }}>Cluster: {clusters[selectedNodeData.cluster]?.label}</p>
                <p style={{ margin: '8px 0 4px', fontWeight: 600 }}>Connections ({connectedEdges.length})</p>
                {connectedEdges.slice(0, 5).map((edge, i) => {
                  const otherId = edge.source === selectedNode ? edge.target : edge.source;
                  const other = simNodes.current.find((n) => n.id === otherId);
                  return (
                    <p key={i} style={{ margin: '0 0 2px', color: '#6b7280', fontSize: 12 }}>
                      → {other?.label ?? otherId} (weight: {edge.weight})
                    </p>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700 }}>Graph Stats</h3>
            <div style={{ fontSize: 13, color: '#6b7280' }}>
              <p style={{ margin: '0 0 4px' }}>Nodes: {simNodes.current.length}</p>
              <p style={{ margin: '0 0 4px' }}>Edges: {dataRef.current.edges.length}</p>
              <p style={{ margin: '0 0 4px' }}>Clusters: {clusters.length}</p>
              <p style={{ margin: 0 }}>Avg degree: {(dataRef.current.edges.length * 2 / simNodes.current.length).toFixed(1)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
