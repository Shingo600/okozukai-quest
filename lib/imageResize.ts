"use client";

/**
 * 画像ファイルを正方リサイズ + JPEG 圧縮した data URL を返す。
 * 失敗時は FileReader で読み込んだ生 data URL（無圧縮）を返す。
 */
export async function resizeToDataUrl(file: File, size = 128, quality = 0.7): Promise<string> {
  try {
    const bitmap = await createImageBitmap(file);
    const sx = (bitmap.width - Math.min(bitmap.width, bitmap.height)) / 2;
    const sy = (bitmap.height - Math.min(bitmap.width, bitmap.height)) / 2;
    const s = Math.min(bitmap.width, bitmap.height);

    const canvas = document.createElement("canvas");
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d ctx");
    ctx.drawImage(bitmap, sx, sy, s, s, 0, 0, size, size);
    bitmap.close?.();
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
  }
}

export function isPhotoAvatar(avatar: string): boolean {
  return avatar.startsWith("data:image");
}
