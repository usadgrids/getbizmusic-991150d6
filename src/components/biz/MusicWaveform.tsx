interface MusicWaveformProps {
  playing: boolean;
  barCount?: number;
  className?: string;
}

export function MusicWaveform({ playing, barCount = 16, className = "" }: MusicWaveformProps) {
  return (
    <div
      className={`inline-flex items-end justify-center gap-[3px] h-6 ${className}`}
      aria-hidden="true"
      role="img"
      aria-label={playing ? "Music waveform playing" : "Music waveform paused"}
    >
      {Array.from({ length: barCount }).map((_, i) => {
        const delay = (i * 0.07) % 0.8;
        const duration = 0.5 + (i % 6) * 0.12;
        const minHeight = 25 + (i % 5) * 12;
        return (
          <span
            key={i}
            className="w-[4px] rounded-full waveform-bar"
            style={{
              height: `${minHeight}%`,
              backgroundColor: playing ? "#D4A24C" : "#9CA3AF",
              animationDelay: `${delay.toFixed(2)}s`,
              animationDuration: `${duration.toFixed(2)}s`,
              opacity: playing ? 1 : 0.55,
            }}
          />
        );
      })}
    </div>
  );
}

