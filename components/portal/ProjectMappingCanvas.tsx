"use client";

import { useMemo, useRef, useState } from "react";

export type ProjectMapNode = {
  id: string;
  type: "team" | "project" | "vehicle" | "repo" | "vault" | "task";
  label: string;
  subtitle?: string;
  href?: string;
  state?: string;
};

export type ProjectMapEdge = {
  id: string;
  source: string;
  target: string;
  relation: string;
  label?: string;
};

type PositionedNode = ProjectMapNode & {
  x: number;
  y: number;
  width: number;
  height: number;
};

const columnX: Record<ProjectMapNode["type"], number> = {
  team: 80,
  project: 370,
  vehicle: 690,
  repo: 690,
  vault: 1050,
  task: 1290,
};

const typeLabel: Record<ProjectMapNode["type"], string> = {
  team: "TAKIM",
  project: "PROJE",
  vehicle: "ARAÇ",
  repo: "REPO",
  vault: "VAULT",
  task: "GÖREV",
};

export default function ProjectMappingCanvas({
  nodes,
  edges,
}: {
  nodes: ProjectMapNode[];
  edges: ProjectMapEdge[];
}) {
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const [viewport,setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [enabled,setEnabled] = useState<Record<ProjectMapNode["type"],boolean>>({
    team: true,
    project: true,
    vehicle: true,
    repo: true,
    vault: true,
    task: true,
  });

  const positioned = useMemo(() => {
    const counters: Partial<Record<ProjectMapNode["type"],number>> = {};
    return nodes.map((node) => {
      const index = counters[node.type] ?? 0;
      counters[node.type] = index + 1;
      const pairOffset = node.type === "repo" ? 145 : 0;
      return {
        ...node,
        x: columnX[node.type] + pairOffset,
        y: 70 + index * 102,
        width: node.type === "project" ? 220 : 190,
        height: 68,
      } satisfies PositionedNode;
    });
  },[nodes]);

  const nodeMap = useMemo(
    () => new Map(positioned.map((node) => [node.id,node])),
    [positioned]
  );

  const visibleEdges = edges.filter((edge) => {
    const source = nodeMap.get(edge.source);
    const target = nodeMap.get(edge.target);
    return Boolean(source && target && enabled[source.type] && enabled[target.type]);
  });

  const visibleNodes = positioned.filter((node) => enabled[node.type]);
  const maxY = Math.max(780,...positioned.map((node) => node.y + node.height + 80));
  const maxX = 1540;

  function reset() {
    setViewport({ x: 0, y: 0, zoom: 1 });
  }

  return (
    <section className="projectMapShell">
      <header className="projectMapToolbar">
        <div>
          <span>CORE / SYSTEM MAP</span>
          <b>{nodes.length} node · {edges.length} relation</b>
        </div>
        <div className="projectMapFilters">
          {(Object.keys(enabled) as ProjectMapNode["type"][]).map((type) => (
            <button
              type="button"
              className={enabled[type] ? "active" : ""}
              key={type}
              onClick={() => setEnabled((value) => ({ ...value, [type]: !value[type] }))}
            >
              {typeLabel[type]}
            </button>
          ))}
          <button type="button" onClick={reset}>SIĞDIR</button>
        </div>
      </header>

      <div
        className="projectMapViewport"
        onWheel={(event) => {
          event.preventDefault();
          const factor = event.deltaY > 0 ? .9 : 1.1;
          setViewport((value) => ({
            ...value,
            zoom: Math.max(.45,Math.min(2.4,value.zoom * factor)),
          }));
        }}
        onPointerDown={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest?.("[data-map-node]")) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = {
            x: event.clientX,
            y: event.clientY,
            px: viewport.x,
            py: viewport.y,
          };
        }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          setViewport((value) => ({
            ...value,
            x: drag.current!.px + event.clientX - drag.current!.x,
            y: drag.current!.py + event.clientY - drag.current!.y,
          }));
        }}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}
      >
        <svg
          viewBox={"0 0 " + maxX + " " + maxY}
          style={{
            transform: `translate(${viewport.x}px,${viewport.y}px) scale(${viewport.zoom})`,
            transformOrigin: "0 0",
          }}
          aria-label="CORE project mapping diagram"
        >
          <defs>
            <marker id="project-map-arrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
              <path d="M0,0 L9,4.5 L0,9 z" />
            </marker>
          </defs>

          <g className="projectMapEdges">
            {visibleEdges.map((edge) => {
              const source = nodeMap.get(edge.source)!;
              const target = nodeMap.get(edge.target)!;
              const sx = source.x + source.width;
              const sy = source.y + source.height / 2;
              const tx = target.x;
              const ty = target.y + target.height / 2;
              const curve = Math.max(55,Math.abs(tx - sx) * .42);
              const d = `M ${sx} ${sy} C ${sx + curve} ${sy}, ${tx - curve} ${ty}, ${tx} ${ty}`;
              return (
                <g key={edge.id}>
                  <path d={d} markerEnd="url(#project-map-arrow)" />
                  {edge.label || edge.relation ? (
                    <text x={(sx + tx) / 2} y={(sy + ty) / 2 - 6}>{edge.label || edge.relation}</text>
                  ) : null}
                </g>
              );
            })}
          </g>

          <g className="projectMapNodes">
            {visibleNodes.map((node) => (
              <g
                data-map-node
                className={"projectMapNode " + node.type}
                transform={`translate(${node.x} ${node.y})`}
                key={node.id}
                onClick={() => {
                  if (node.href) window.location.href = node.href;
                }}
                role={node.href ? "link" : undefined}
                tabIndex={node.href ? 0 : undefined}
                onKeyDown={(event) => {
                  if (node.href && (event.key === "Enter" || event.key === " ")) {
                    window.location.href = node.href;
                  }
                }}
              >
                <rect width={node.width} height={node.height} rx="10" />
                <text className="type" x="13" y="18">{typeLabel[node.type]}</text>
                <text className="label" x="13" y="39">{node.label.slice(0,34)}</text>
                <text className="subtitle" x="13" y="56">{String(node.subtitle || node.state || "").slice(0,42)}</text>
                {node.state ? <circle cx={node.width - 14} cy="15" r="4" className={"state " + node.state} /> : null}
              </g>
            ))}
          </g>
        </svg>
      </div>

      <footer>
        Sürükle: haritayı taşı · tekerlek: zoom · node: workspace aç · ilişkiler V6 control-plane kayıtlarından ve sahiplik alanlarından üretilir
      </footer>
    </section>
  );
}
