import { ARTIFACT_MODE, capability } from "./artifact/bridge";

export async function downloadFile(filename: string, content: string, mime: string) {
  // BOM so that Excel opens UTF-8 CSV (umlauts, accents) correctly.
  const body = mime.startsWith("text/csv") ? "\uFEFF" + content : content;
  if (ARTIFACT_MODE) {
    // Inside claude.ai the viewer asks for confirmation and saves the file.
    const downloads = await capability("downloads");
    if (downloads) {
      await downloads.save({ filename, data: new Blob([body], { type: mime }) }).catch(() => undefined);
      return;
    }
  }
  const url = URL.createObjectURL(new Blob([body], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function timestamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}
