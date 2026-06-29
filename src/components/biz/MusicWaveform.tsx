interface MusicWaveformProps {
  playing: boolean;
  barCount?: number;
  className?: string;
}

export function MusicWaveform({ playing, barCount = 14, className = "" }: MusicWaveformProps) {
  return (
    <div
      className={`inline-flex items-end gap-[2px] h-4 ${className}`}
      aria-hidden="true"
      role="img"
      aria-label={playing ? "Music waveform playing" : "Music waveform paused"}
    >
      {Array.from({ length: barCount }).map((_, i) => {
        const delay = (i * 0.09) % 0.7;
        const duration = 0.55 + (i % 5) * 0.12;
        const minHeight = 20 + (i % 4) * 10;
        return (
          <span
            key={i}
            className="w-[3px] rounded-full bg-[#D4A24C] waveform-bar"
            style={{
              height: `${minHeight}%`,
              animationDelay: `${delay.toFixed(2)}s`,
              animationDuration: `${duration.toFixed(2)}s`,
              animationPlayState: playing ? "running" : "paused",
              opacity: playing ? 1 : 0.5,
            }}
          />
        );
      })}
    </div>
  );
}
