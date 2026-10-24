import React from "react";

const PALETTE = ["#985f99", "#D4AF87", "#7d4f80", "#b08968", "#6B5E50", "#c084b8"];

export function initialsOf(name = "") {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((n) => n[0].toUpperCase()).join("") || "?";
}

export function colorFor(name = "") {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/** Photo if available, otherwise a coloured initials badge ("default DP"). */
export default function Avatar({ name, src, size = 40, className = "", rounded = "rounded-xl" }) {
  const style = { width: size, height: size, fontSize: Math.max(11, size / 2.6) };
  if (src) {
    return <img src={src} alt={name || ""} style={style} className={`${rounded} object-cover flex-shrink-0 ${className}`} data-testid="avatar-img" />;
  }
  return (
    <div style={{ ...style, background: colorFor(name) }} className={`${rounded} flex items-center justify-center text-white font-semibold flex-shrink-0 select-none ${className}`} data-testid="avatar-initials" aria-label={name}>
      {initialsOf(name)}
    </div>
  );
}

/**
 * Read an image file, centre-crop it to a square and downscale it so the
 * resulting data URL stays small enough to live in the database.
 */
export async function fileToSquareDataUrl(file, size = 320, quality = 0.85) {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not read that image"));
      el.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - side) / 2;
    const sy = (img.naturalHeight - side) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    canvas.getContext("2d").drawImage(img, sx, sy, side, side, 0, 0, size, size);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}
