import qrcode from "qrcode-generator";
import { useMemo } from "react";

/** The address of the app itself, whatever host it is served from. */
export function appUrl(): string {
  if (typeof window === "undefined") return "";
  const base = import.meta.env.BASE_URL || "/";
  return window.location.origin + (base.endsWith("/") ? base : base + "/");
}

/**
 * QR code drawn as a single SVG path – no canvas, no network, scales to any size.
 * Error correction M survives a bit of glare on a TV screen.
 */
export default function QrCode({ text, className }: { text: string; className?: string }) {
  const { size, path } = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount();
    let d = "";
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) if (qr.isDark(y, x)) d += `M${x} ${y}h1v1h-1z`;
    }
    return { size: n, path: d };
  }, [text]);

  return (
    <svg
      viewBox={`-2 -2 ${size + 4} ${size + 4}`}
      className={className}
      shapeRendering="crispEdges"
      role="img"
      aria-label={text}
    >
      <rect x={-2} y={-2} width={size + 4} height={size + 4} fill="#fff" />
      <path d={path} fill="#01135B" />
    </svg>
  );
}
