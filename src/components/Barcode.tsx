"use client";

import { useMemo } from "react";

type BarcodeProps = {
  value: string;
  label?: string;
};

// Light-weight text-based barcode representation for the POC.
export function Barcode({ value, label }: BarcodeProps) {
  const pattern = useMemo(() => {
    return value
      .split("")
      .map((char, index) => (
        <span
          key={`${char}-${index}`}
          className="inline-block h-16 w-1 bg-foreground"
          style={{
            marginRight: index % 2 === 0 ? 1 : 0,
            opacity: char.charCodeAt(0) % 2 === 0 ? 0.65 : 0.85,
          }}
        />
      ));
  }, [value]);

  return (
    <div className="flex flex-col items-center gap-2 border p-2">
      <div className="flex items-end gap-[1px]" aria-hidden>
        {pattern}
      </div>
      <span className="text-xs font-mono tracking-widest">{value}</span>
      {label ? <span className="text-[10px] text-muted-foreground">{label}</span> : null}
    </div>
  );
}
