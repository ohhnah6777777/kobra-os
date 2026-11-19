export function SixDots({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden fill="currentColor">
      {[4, 10, 16].map((x) => [6, 14].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.9" />))}
    </svg>
  );
}
