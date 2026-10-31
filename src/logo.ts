/** Longest data URL we keep: big enough for a crisp mark, small enough for a backup. */
const MAX_BYTES = 150_000;
/** Longest edge of the stored bitmap. The mark is never shown larger than this. */
const MAX_EDGE = 320;

export class LogoError extends Error {}

/**
 * Turns a picked file into a data URL the app can store in its settings.
 * Bitmaps are scaled down first, so a 5 MB phone photo does not end up in
 * every backup; SVGs are kept as they are, since they scale by themselves.
 */
export async function readLogoFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new LogoError("not-an-image");
  const dataUrl = await toDataUrl(file);
  const out = file.type === "image/svg+xml" ? dataUrl : await shrink(dataUrl);
  if (out.length > MAX_BYTES) throw new LogoError("too-large");
  return out;
}

function toDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new LogoError("unreadable"));
    r.readAsDataURL(file);
  });
}

function shrink(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new LogoError("unreadable"));
      ctx.drawImage(img, 0, 0, w, h);
      // PNG keeps the transparent background club marks usually have.
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new LogoError("unreadable"));
    img.src = dataUrl;
  });
}
