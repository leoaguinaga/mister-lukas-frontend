'use client';

interface Props {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}

export function CantidadControl({ value, onChange, min = 0, max = 20 }: Props) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="h-9 w-9 rounded-full border border-border flex items-center justify-center text-lg font-medium disabled:opacity-30 hover:bg-muted transition-colors"
      >
        −
      </button>
      <span className="w-6 text-center font-semibold tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="h-9 w-9 rounded-full border border-border flex items-center justify-center text-lg font-medium disabled:opacity-30 hover:bg-muted transition-colors"
      >
        +
      </button>
    </div>
  );
}
