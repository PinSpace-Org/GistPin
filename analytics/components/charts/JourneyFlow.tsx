'use client';

// Flow diagram using plain SVG — no new packages required.

interface FlowNode {
  id: string;
  label: string;
  x: number;
  y: number;
}

interface FlowEdge {
  from: string;
  to: string;
  users: number;
}

const NODES: FlowNode[] = [
  { id: 'landing', label: 'Landing', x: 60, y: 160 },
  { id: 'map', label: 'Map', x: 220, y: 80 },
  { id: 'dashboard', label: 'Dashboard', x: 220, y: 240 },
  { id: 'gist', label: 'Gist Detail', x: 400, y: 80 },
  { id: 'post', label: 'Post Gist', x: 400, y: 240 },
  { id: 'profile', label: 'Profile', x: 580, y: 160 },
  { id: 'exit', label: 'Exit', x: 740, y: 160 },
];

const EDGES: FlowEdge[] = [
  { from: 'landing', to: 'map', users: 820 },
  { from: 'landing', to: 'dashboard', users: 540 },
  { from: 'map', to: 'gist', users: 610 },
  { from: 'map', to: 'post', users: 290 },
  { from: 'dashboard', to: 'post', users: 380 },
  { from: 'dashboard', to: 'map', users: 210 },
  { from: 'gist', to: 'profile', users: 430 },
  { from: 'post', to: 'profile', users: 350 },
  { from: 'profile', to: 'exit', users: 680 },
  { from: 'gist', to: 'exit', users: 200 },
];

const MAX_USERS = Math.max(...EDGES.map((e) => e.users));
const NODE_R = 36;
const W = 820;
const H = 340;

function nodeById(id: string) { return NODES.find((n) => n.id === id)!; }

function edgeColor(users: number) {
  const t = users / MAX_USERS;
  const r = Math.round(59 + t * (139 - 59));
  const g = Math.round(130 + t * (92 - 130));
  const b = Math.round(246 + t * (246 - 246));
  return `rgba(${r},${g},${b},${0.35 + t * 0.55})`;
}

export default function JourneyFlow() {
  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 600, display: 'block' }}>
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#94a3b8" />
          </marker>
        </defs>

        {/* Edges */}
        {EDGES.map((edge) => {
          const src = nodeById(edge.from);
          const dst = nodeById(edge.to);
          const thickness = 2 + (edge.users / MAX_USERS) * 14;
          const dx = dst.x - src.x;
          const dy = dst.y - src.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const ux = dx / len;
          const uy = dy / len;
          const x1 = src.x + ux * NODE_R;
          const y1 = src.y + uy * NODE_R;
          const x2 = dst.x - ux * (NODE_R + 8);
          const y2 = dst.y - uy * (NODE_R + 8);
          const mx = (x1 + x2) / 2;
          const my = (y1 + y2) / 2 - 30;
          return (
            <g key={`${edge.from}-${edge.to}`}>
              <path
                d={`M${x1},${y1} Q${mx},${my} ${x2},${y2}`}
                fill="none"
                stroke={edgeColor(edge.users)}
                strokeWidth={thickness}
                markerEnd="url(#arrow)"
              />
              <text x={mx} y={my - 4} textAnchor="middle" fontSize={10} fill="#64748b">
                {edge.users.toLocaleString()}
              </text>
            </g>
          );
        })}

        {/* Nodes */}
        {NODES.map((node) => (
          <g key={node.id}>
            <circle cx={node.x} cy={node.y} r={NODE_R} fill="#1d4ed8" opacity={0.9} />
            <text x={node.x} y={node.y + 1} textAnchor="middle" dominantBaseline="middle"
              fontSize={11} fontWeight="700" fill="#fff">
              {node.label}
            </text>
          </g>
        ))}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12, color: '#64748b', flexWrap: 'wrap' }}>
        <span>Edge thickness = user count</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ display: 'inline-block', width: 24, height: 4, background: edgeColor(MAX_USERS), borderRadius: 2 }} />
          High traffic
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ display: 'inline-block', width: 24, height: 2, background: edgeColor(200), borderRadius: 2 }} />
          Low traffic
        </span>
      </div>
    </div>
  );
}
