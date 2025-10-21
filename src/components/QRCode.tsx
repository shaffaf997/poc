"use client";

import { QRCodeCanvas } from "qrcode.react";

type QRCodeProps = {
  value: string;
  size?: number;
  title?: string;
};

export function QRCode({ value, size = 128, title }: QRCodeProps) {
  return (
    <div className="inline-flex flex-col items-center gap-2">
      <QRCodeCanvas value={value} size={size} includeMargin />
      {title ? <span className="text-xs text-muted-foreground">{title}</span> : null}
    </div>
  );
}
