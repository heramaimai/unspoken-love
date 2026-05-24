"use client";

import { useEffect, useRef } from "react";

type Sample = {
  u: number;
  v: number;
  phase: number;
  size: number;
  alpha: number;
};

export default function MobiusCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    let width = 0;
    let height = 0;
    let frame = 0;
    let samples: Sample[] = [];

    const R = 1;
    const W = 0.34;
    const sampleCount = 720;

    const initSamples = () => {
      samples = Array.from({ length: sampleCount }, (_, index) => {
        const u = (index / sampleCount) * Math.PI * 2;
        const v = (Math.random() - 0.5) * W * 1.6;
        return {
          u,
          v,
          phase: Math.random() * Math.PI * 2,
          size: 0.8 + Math.random() * 1.6,
          alpha: 0.25 + Math.random() * 0.55,
        };
      });
    };

    const mobiusPoint = (u: number, v: number) => {
      const half = u / 2;
      const ring = R + v * Math.cos(half);
      return {
        x: ring * Math.cos(u),
        y: ring * Math.sin(u),
        z: v * Math.sin(half),
      };
    };

    const rotate = (
      point: { x: number; y: number; z: number },
      ax: number,
      ay: number,
      az: number,
    ) => {
      let { x, y, z } = point;

      const cosY = Math.cos(ay);
      const sinY = Math.sin(ay);
      const x1 = x * cosY + z * sinY;
      const z1 = -x * sinY + z * cosY;
      x = x1;
      z = z1;

      const cosX = Math.cos(ax);
      const sinX = Math.sin(ax);
      const y2 = y * cosX - z * sinX;
      const z2 = y * sinX + z * cosX;
      y = y2;
      z = z2;

      const cosZ = Math.cos(az);
      const sinZ = Math.sin(az);
      const x3 = x * cosZ - y * sinZ;
      const y3 = x * sinZ + y * cosZ;

      return { x: x3, y: y3, z: z2 };
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initSamples();
    };

    const tick = (now: number) => {
      frame = window.requestAnimationFrame(tick);
      const time = now * 0.001;

      ctx.clearRect(0, 0, width, height);

      const ax = 0.55 + Math.sin(time * 0.22) * 0.12;
      const ay = time * 0.38;
      const az = Math.sin(time * 0.18) * 0.08;
      const scale = Math.min(width, height) * 0.22;
      const cx = width * 0.5;
      const cy = height * 0.46;
      const flow = time * 0.55;

      const projected: Array<{ sx: number; sy: number; z: number; sample: Sample }> = [];

      for (const sample of samples) {
        sample.u = (sample.u + 0.0028) % (Math.PI * 2);
        const u = sample.u + flow * 0.15;
        const wobble = Math.sin(time * 1.4 + sample.phase) * 0.015;
        const raw = mobiusPoint(u, sample.v + wobble);
        const rotated = rotate(raw, ax, ay, az);
        const perspective = 2.8 / (2.8 + rotated.z);
        projected.push({
          sx: cx + rotated.x * scale * perspective,
          sy: cy + rotated.y * scale * perspective,
          z: rotated.z,
          sample,
        });
      }

      projected.sort((a, b) => a.z - b.z);

      for (const point of projected) {
        const depth = (point.z + 1.4) / 2.8;
        const alpha = point.sample.alpha * (0.35 + depth * 0.65);
        const size = point.sample.size * (0.7 + depth * 0.55);
        const warm = 190 + depth * 45;

        ctx.beginPath();
        ctx.fillStyle = `rgba(${warm | 0}, ${(warm * 0.82) | 0}, ${(warm * 0.58) | 0}, ${alpha})`;
        ctx.shadowBlur = size > 2 ? 10 : 4;
        ctx.shadowColor = "rgba(210, 175, 120, 0.35)";
        ctx.arc(point.sx, point.sy, size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.shadowBlur = 0;

      // 细线连接相邻粒子，增强环的流动感
      ctx.strokeStyle = "rgba(196, 168, 130, 0.06)";
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      for (let i = 0; i < projected.length; i += 3) {
        const current = projected[i];
        const next = projected[(i + 1) % projected.length];
        ctx.moveTo(current.sx, current.sy);
        ctx.lineTo(next.sx, next.sy);
      }
      ctx.stroke();
    };

    resize();
    window.addEventListener("resize", resize);
    frame = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="mobius-canvas" aria-hidden="true" />;
}
