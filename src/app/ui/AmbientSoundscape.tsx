"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type AmbientNodes = {
  ctx: AudioContext;
  master: GainNode;
  xiaoGain: GainNode;
  starGain: GainNode;
  timers: number[];
  stopped: boolean;
};

function scheduleStar(nodes: AmbientNodes) {
  if (nodes.stopped) {
    return;
  }

  const delay = 400 + Math.random() * 2800;
  const id = window.setTimeout(() => {
    if (nodes.stopped) {
      return;
    }

    const { ctx, starGain } = nodes;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "sine";
    osc.frequency.value = 1800 + Math.random() * 5200;
    filter.type = "highpass";
    filter.frequency.value = 1200;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.018 + Math.random() * 0.022, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35 + Math.random() * 0.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(starGain);

    osc.start(now);
    osc.stop(now + 1.2);

    scheduleStar(nodes);
  }, delay);

  nodes.timers.push(id);
}

function playXiaoBreath(nodes: AmbientNodes) {
  if (nodes.stopped) {
    return;
  }

  const { ctx, xiaoGain } = nodes;
  const now = ctx.currentTime;
  const base = 196 + Math.random() * 90;

  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  const lfo = ctx.createOscillator();
  const lfoAmp = ctx.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(base * 0.98, now);
  osc.frequency.linearRampToValueAtTime(base * 1.02, now + 2.8);

  lfo.type = "sine";
  lfo.frequency.value = 0.14 + Math.random() * 0.06;
  lfoAmp.gain.value = 0.35;
  lfo.connect(lfoAmp);
  lfoAmp.connect(amp.gain);

  filter.type = "bandpass";
  filter.frequency.value = 520 + Math.random() * 280;
  filter.Q.value = 2.4;

  amp.gain.setValueAtTime(0, now);
  amp.gain.linearRampToValueAtTime(0.045 + Math.random() * 0.035, now + 0.6);
  amp.gain.linearRampToValueAtTime(0.02, now + 2.2);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + 4.5);

  osc.connect(filter);
  filter.connect(amp);
  amp.connect(xiaoGain);

  osc.start(now);
  lfo.start(now);
  osc.stop(now + 5);
  lfo.stop(now + 5);

  const id = window.setTimeout(() => playXiaoBreath(nodes), 3200 + Math.random() * 4200);
  nodes.timers.push(id);
}

function playXiaoDrone(nodes: AmbientNodes) {
  const { ctx, xiaoGain } = nodes;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const noise = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const amp = ctx.createGain();

  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * 0.35;
  }
  noise.buffer = buffer;
  noise.loop = true;

  osc.type = "sine";
  osc.frequency.value = 146.83;
  osc2.type = "sine";
  osc2.frequency.value = 220;

  filter.type = "lowpass";
  filter.frequency.value = 680;
  filter.Q.value = 0.6;

  amp.gain.value = 0.028;

  noise.connect(filter);
  osc.connect(amp);
  osc2.connect(amp);
  amp.connect(xiaoGain);

  noise.start(now);
  osc.start(now);
  osc2.start(now);

  return () => {
    try {
      noise.stop();
      osc.stop();
      osc2.stop();
    } catch {
      // already stopped
    }
  };
}

function createSoundscape(): AmbientNodes {
  const ctx = new AudioContext();
  const master = ctx.createGain();
  const xiaoGain = ctx.createGain();
  const starGain = ctx.createGain();

  master.gain.value = 0.85;
  xiaoGain.gain.value = 1;
  starGain.gain.value = 1;

  xiaoGain.connect(master);
  starGain.connect(master);
  master.connect(ctx.destination);

  const nodes: AmbientNodes = {
    ctx,
    master,
    xiaoGain,
    starGain,
    timers: [],
    stopped: false,
  };

  playXiaoDrone(nodes);
  playXiaoBreath(nodes);
  for (let i = 0; i < 5; i += 1) {
    scheduleStar(nodes);
  }

  return nodes;
}

function stopSoundscape(nodes: AmbientNodes | null) {
  if (!nodes) {
    return;
  }

  nodes.stopped = true;
  for (const id of nodes.timers) {
    window.clearTimeout(id);
  }
  nodes.timers = [];

  void nodes.ctx.close().catch(() => undefined);
}

type AmbientSoundscapeProps = {
  active: boolean;
};

export default function AmbientSoundscape({ active }: AmbientSoundscapeProps) {
  const nodesRef = useRef<AmbientNodes | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [needsGesture, setNeedsGesture] = useState(true);

  const start = useCallback(async () => {
    if (nodesRef.current) {
      if (nodesRef.current.ctx.state === "suspended") {
        await nodesRef.current.ctx.resume();
      }
      setPlaying(true);
      setNeedsGesture(false);
      return;
    }

    const nodes = createSoundscape();
    nodesRef.current = nodes;

    if (nodes.ctx.state === "suspended") {
      await nodes.ctx.resume();
    }

    setPlaying(true);
    setNeedsGesture(false);
  }, []);

  const stop = useCallback(() => {
    stopSoundscape(nodesRef.current);
    nodesRef.current = null;
    setPlaying(false);
  }, []);

  useEffect(() => {
    if (!active) {
      stop();
      return;
    }

    return () => {
      stop();
    };
  }, [active, stop]);

  useEffect(() => {
    if (!nodesRef.current) {
      return;
    }
    nodesRef.current.master.gain.setTargetAtTime(muted ? 0 : 0.85, nodesRef.current.ctx.currentTime, 0.4);
  }, [muted]);

  return (
    <div className="ambient-sound">
      {needsGesture && active ? (
        <button type="button" className="ambient-sound-btn" onClick={() => void start()}>
          开启环境音
        </button>
      ) : (
        <button
          type="button"
          className="ambient-sound-btn"
          onClick={() => {
            if (!playing) {
              void start();
              return;
            }
            setMuted((value) => !value);
          }}
          aria-label={muted ? "开启环境音" : "关闭环境音"}
        >
          {muted ? "环境音关" : "环境音开"}
        </button>
      )}
    </div>
  );
}
