import React, { useEffect, useRef, useState } from 'react';
import * as ttsService from '../services/ttsService';

export const SpectrumBadge: React.FC<{ size?: number; className?: string; targetId?: string }> = ({ size = 32, className, targetId }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [active, setActive] = useState<boolean>(false);

  useEffect(() => {
    const onAudio = (e: { type: 'start' | 'stop'; analyser?: AnalyserNode | null; speakerId?: string }) => {
      if (targetId && e.speakerId && e.speakerId !== targetId) {
        return; // ignore events for other speakers
      }
      if (e.type === 'start') {
        setAnalyser(e.analyser ?? null);
        setActive(true);
      } else {
        setActive(false);
        setAnalyser(null);
      }
    };
    ttsService.addTtsAudioListener(onAudio as any);
    return () => ttsService.removeTtsAudioListener(onAudio as any);
  }, [targetId]);

  useEffect(() => {
    let rafId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      if (!active) {
        // Clear when inactive
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        rafId = requestAnimationFrame(draw);
        return;
      }
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const bars = 12;
      const gap = 2;
      const barWidth = Math.max(1, Math.floor((w - gap * (bars - 1)) / bars));

      if (analyser) {
        const freqData = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(freqData);
        for (let i = 0; i < bars; i++) {
          const idx = Math.floor((i / bars) * freqData.length);
          const val = freqData[idx] / 255; // 0..1
          const barHeight = Math.max(2, Math.floor(val * h));
          const x = i * (barWidth + gap);
          const y = h - barHeight;
          ctx.fillStyle = 'rgba(16,185,129,0.85)';
          ctx.fillRect(x, y, barWidth, barHeight);
        }
      } else {
        // Placeholder animation when analyser not available (browser TTS)
        const t = Date.now() / 200;
        for (let i = 0; i < bars; i++) {
          const val = (Math.sin(t + i * 0.7) + 1) / 2; // 0..1
          const barHeight = Math.max(2, Math.floor(val * h));
          const x = i * (barWidth + gap);
          const y = h - barHeight;
          ctx.fillStyle = 'rgba(16,185,129,0.6)';
          ctx.fillRect(x, y, barWidth, barHeight);
        }
      }
      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [analyser, active]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={`absolute inset-0 rounded-full pointer-events-none mix-blend-screen ${className || ''}`}
      style={{ filter: 'drop-shadow(0 0 2px rgba(16,185,129,0.7))' }}
    />
  );
};
