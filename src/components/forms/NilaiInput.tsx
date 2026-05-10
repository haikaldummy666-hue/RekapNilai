import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { clampNilai } from "@/utils/formatUtils";

interface Props {
  value: number;
  onCommit: (v: number) => void;
  className?: string;
  ariaLabel?: string;
}

/**
 * Input nilai 0–100 dengan clamp otomatis dan commit on blur/Enter.
 */
export function NilaiInput({ value, onCommit, className, ariaLabel }: Props) {
  const [raw, setRaw] = useState<string>(value ? String(value) : "");

  useEffect(() => {
    setRaw(value ? String(value) : "");
  }, [value]);

  const commit = () => {
    const n = clampNilai(parseFloat(raw.replace(",", ".")) || 0);
    onCommit(n);
    setRaw(n ? String(n) : "");
  };

  return (
    <Input
      type="number"
      inputMode="decimal"
      min={0}
      max={100}
      step="0.5"
      value={raw}
      aria-label={ariaLabel}
      onChange={(e) => setRaw(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      className={cn("h-9 w-20 text-center tabular-nums", className)}
    />
  );
}
