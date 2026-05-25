"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const AMBIENT_SRC = "/audio/orbit-memory.mp3";
const AMBIENT_VOLUME = 0.55;

type AmbientSoundscapeProps = {
  active: boolean;
};

export default function AmbientSoundscape({ active }: AmbientSoundscapeProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [needsGesture, setNeedsGesture] = useState(true);

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio(AMBIENT_SRC);
      audio.loop = true;
      audio.preload = "auto";
      audio.volume = AMBIENT_VOLUME;
      audioRef.current = audio;
    }
    return audioRef.current;
  }, []);

  const start = useCallback(async () => {
    const audio = getAudio();
    audio.volume = muted ? 0 : AMBIENT_VOLUME;
    try {
      await audio.play();
      setPlaying(true);
      setNeedsGesture(false);
    } catch {
      setNeedsGesture(true);
    }
  }, [getAudio, muted]);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    audio.pause();
    audio.currentTime = 0;
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
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    audio.volume = muted ? 0 : AMBIENT_VOLUME;
  }, [muted]);

  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.src = "";
        audioRef.current = null;
      }
    };
  }, []);

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
