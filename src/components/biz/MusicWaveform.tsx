interface MusicWaveformProps {
  playing: boolean;
  barCount?: number;
  className?: string;
}

// Vibrant gradient palette cycled across bars when playing.
const PLAYING_COLORS = [
  "#FF3D7F", // pink
  "#FF7A3D", // orange
  "#F4C430", // gold
  "#3DDC97", // mint
  "#3DB4FF", // sky
  "#8B5CF6", // violet
];

export function MusicWaveform({ playing, barCount = 22, className = "" }: MusicWaveformProps) {
  return (
    <div
      className={`inline-flex items-end justify-center gap-[4px] h-7 ${className}`}
      aria-hidden="true"
      role="img"
      aria-label={playing ? "Music waveform playing" : "Music waveform paused"}
    >
      {Array.from({ length: barCount }).map((_, i) => {
        const delay = (i * 0.07) % 0.8;
        const duration = 0.5 + (i % 6) * 0.12;
        const minHeight = 25 + (i % 5) * 12;
        const color = PLAYING_COLORS[i % PLAYING_COLORS.length];
        return (
          <span
            key={i}
            className="w-[5px] rounded-full waveform-bar"
            style={{
              height: `${minHeight}%`,
              backgroundColor: color,
              boxShadow: playing ? `0 0 8px ${color}, 0 0 2px ${color}` : "none",
              animationDelay: `${delay.toFixed(2)}s`,
              animationDuration: `${duration.toFixed(2)}s`,
              opacity: playing ? 1 : 0.45,
              filter: playing ? "saturate(1.2)" : "saturate(0.6)",
            }}
          />
        );
      })}
    </div>
  );
}
