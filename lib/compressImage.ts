import imageCompression from "browser-image-compression";

export async function compressImage(file: File): Promise<File> {
  if (file.type === "image/gif") return file;

  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: file.type,
    initialQuality: 0.8,
  };

  const compressed = await imageCompression(file, options);
  if (compressed.size >= file.size) return file;

  return new File([compressed], file.name, { type: compressed.type });
}
