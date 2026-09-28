"use client";

import { useEffect, useRef, useState } from "react";

type Point = [number, number, number];
type Triangle = [Point, Point, Point];

function parseStl(buffer: ArrayBuffer): Triangle[] {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const triangles: Triangle[] = [];

  if (buffer.byteLength >= 84) {
    const count = view.getUint32(80, true);
    if (84 + count * 50 <= buffer.byteLength) {
      const limit = Math.min(count, 18000);
      for (let i = 0; i < limit; i += 1) {
        const base = 84 + i * 50 + 12;
        const tri: Point[] = [];
        for (let v = 0; v < 3; v += 1) {
          const o = base + v * 12;
          tri.push([
            view.getFloat32(o, true),
            view.getFloat32(o + 4, true),
            view.getFloat32(o + 8, true),
          ]);
        }
        triangles.push(tri as Triangle);
      }
      return triangles;
    }
  }

  const text = new TextDecoder().decode(bytes);
  const values = [...text.matchAll(/vertex\s+([\-\d.eE+]+)\s+([\-\d.eE+]+)\s+([\-\d.eE+]+)/g)]
    .map((match) => [Number(match[1]), Number(match[2]), Number(match[3])] as Point);
  for (let i = 0; i + 2 < values.length && triangles.length < 18000; i += 3) {
    triangles.push([values[i], values[i + 1], values[i + 2]]);
  }
  return triangles;
}

function normalize(triangles: Triangle[]) {
  if (!triangles.length) return triangles;
  const points = triangles.flat();
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const zs = points.map((p) => p[2]);
  const center: Point = [
    (Math.min(...xs) + Math.max(...xs)) / 2,
    (Math.min(...ys) + Math.max(...ys)) / 2,
    (Math.min(...zs) + Math.max(...zs)) / 2,
  ];
  const span = Math.max(
    Math.max(...xs) - Math.min(...xs),
    Math.max(...ys) - Math.min(...ys),
    Math.max(...zs) - Math.min(...zs),
    1
  );
  return triangles.map((triangle) =>
    triangle.map((p) => [
      (p[0] - center[0]) / span,
      (p[1] - center[1]) / span,
      (p[2] - center[2]) / span,
    ]) as Triangle
  );
}

export default function StlPreview({ src }: { src: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [triangles, setTriangles] = useState<Triangle[]>([]);
  const [rotation, setRotation] = useState({ x: -0.55, y: 0.65 });
  const drag = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    fetch(src, { credentials: "same-origin" })
      .then((response) => {
        if (!response.ok) throw new Error("STL yüklenemedi.");
        return response.arrayBuffer();
      })
      .then((buffer) => setTriangles(normalize(parseStl(buffer))))
      .catch(() => setTriangles([]));
  }, [src]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = "#111317";
    ctx.fillRect(0, 0, rect.width, rect.height);

    const cosX = Math.cos(rotation.x), sinX = Math.sin(rotation.x);
    const cosY = Math.cos(rotation.y), sinY = Math.sin(rotation.y);
    const project = (p: Point) => {
      const x1 = p[0] * cosY + p[2] * sinY;
      const z1 = -p[0] * sinY + p[2] * cosY;
      const y1 = p[1] * cosX - z1 * sinX;
      const z2 = p[1] * sinX + z1 * cosX;
      const depth = 2.4 + z2;
      const scale = Math.min(rect.width, rect.height) * 1.35 / depth;
      return [rect.width / 2 + x1 * scale, rect.height / 2 - y1 * scale] as const;
    };

    ctx.strokeStyle = "rgba(255,101,0,.38)";
    ctx.lineWidth = 0.75;
    for (const triangle of triangles) {
      const a = project(triangle[0]);
      const b = project(triangle[1]);
      const c = project(triangle[2]);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.lineTo(c[0], c[1]);
      ctx.closePath();
      ctx.stroke();
    }
  }, [triangles, rotation]);

  return (
    <div className="portalStlPreview">
      <canvas
        ref={canvasRef}
        onPointerDown={(event) => {
          drag.current = { x: event.clientX, y: event.clientY };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          const dx = event.clientX - drag.current.x;
          const dy = event.clientY - drag.current.y;
          drag.current = { x: event.clientX, y: event.clientY };
          setRotation((value) => ({ x: value.x + dy * 0.01, y: value.y + dx * 0.01 }));
        }}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}
      />
      <span>{triangles.length ? triangles.length.toLocaleString("tr-TR") + " üçgen · sürükleyerek döndür" : "3B model okunuyor..."}</span>
    </div>
  );
}
