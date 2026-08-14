// Circular "AI Visibility Score" badge, built as SVG and rasterized to PNG in
// the browser (the server runtime has no canvas).

const NAVY = "#0B1E3F";
const NAVY_DEEP = "#071530";
const GOLD = "#E8B54B";
const AMBER = "#F0913A";
const RED = "#E2574C";

export function bandColor(score: number): string {
  if (score >= 80) return GOLD;
  if (score >= 60) return AMBER;
  return RED;
}

export function buildScoreBadgeSvg(score: number, size = 1000): string {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  const color = bandColor(s);
  const cx = 500;
  const cy = 500;
  const r = 370;
  const circumference = 2 * Math.PI * r;
  const filled = (circumference * s) / 100;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1000 1000" font-family="Helvetica, Arial, sans-serif">
  <defs>
    <radialGradient id="bg" cx="50%" cy="35%" r="75%">
      <stop offset="0%" stop-color="${NAVY}"/>
      <stop offset="100%" stop-color="${NAVY_DEEP}"/>
    </radialGradient>
    <path id="arcTop" d="M 500,500 m -418,0 a 418,418 0 0 1 836,0" fill="none"/>
    <path id="arcBottom" d="M 500,500 m -418,0 a 418,418 0 0 0 836,0" fill="none"/>
  </defs>

  <circle cx="${cx}" cy="${cy}" r="490" fill="url(#bg)"/>
  <circle cx="${cx}" cy="${cy}" r="452" fill="none" stroke="${color}" stroke-opacity="0.35" stroke-width="3"/>

  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#FFFFFF" stroke-opacity="0.14" stroke-width="46"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="46" stroke-linecap="round"
    stroke-dasharray="${filled.toFixed(2)} ${(circumference - filled).toFixed(2)}"
    transform="rotate(-90 ${cx} ${cy})"/>

  <text x="${cx}" y="470" text-anchor="middle" fill="#FFFFFF" font-size="250" font-weight="bold" letter-spacing="-6">${s}</text>
  <text x="${cx}" y="545" text-anchor="middle" fill="${color}" font-size="72" font-weight="bold">/100</text>
  <text x="${cx}" y="632" text-anchor="middle" fill="#FFFFFF" font-size="52" font-weight="bold" letter-spacing="6">AI VISIBILITY</text>
  <text x="${cx}" y="694" text-anchor="middle" fill="#FFFFFF" fill-opacity="0.85" font-size="46" font-weight="bold" letter-spacing="10">SCORE</text>

  <text font-size="34" font-weight="bold" letter-spacing="8" fill="${color}">
    <textPath href="#arcTop" startOffset="50%" text-anchor="middle">AI OPTIMIZATION AUDIT</textPath>
  </text>
  <text font-size="32" font-weight="bold" letter-spacing="4" fill="#FFFFFF" fill-opacity="0.9">
    <textPath href="#arcBottom" startOffset="50%" text-anchor="middle">audited by www.GetBizMusic.com</textPath>
  </text>
</svg>`;
}

export function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Rasterize the badge SVG to a PNG blob in the browser. */
export async function scoreBadgePng(score: number, size = 1000): Promise<Blob> {
  const svg = buildScoreBadgeSvg(score, size);
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Could not render the badge image."));
    img.src = svgDataUrl(svg);
  });
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  ctx.drawImage(img, 0, 0, size, size);
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG export failed."))), "image/png"),
  );
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
