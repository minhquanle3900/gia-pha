function readFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không thể đọc tệp đã chọn.'));
    reader.onabort = () => reject(new Error('Đã hủy đọc tệp.'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onerror = () => reject(new Error('Định dạng ảnh không được thiết bị hỗ trợ hoặc tệp bị hỏng.'));
    image.onload = () => resolve(image);
    image.src = url;
  });
}

export async function compressImageFile(
  file: File,
  maxDimension = 1200,
  quality = 0.82
): Promise<{ dataUrl: string; mimeType: string; width: number; height: number; sizeBytes: number }> {
  if (file.type && !file.type.startsWith('image/')) {
    return {
      dataUrl: await readFileAsDataUrl(file),
      mimeType: file.type,
      width: 0,
      height: 0,
      sizeBytes: file.size,
    };
  }

  // Decode camera files without allocating a second base64 copy of the original.
  const url = URL.createObjectURL(file);
  const canvas = document.createElement('canvas');
  try {
    const image = await loadImage(url);
    const { naturalWidth, naturalHeight } = image;
    const scale = Math.min(1, maxDimension / Math.max(naturalWidth, naturalHeight));
    const width = Math.max(1, Math.round(naturalWidth * scale));
    const height = Math.max(1, Math.round(naturalHeight * scale));
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Thiết bị không thể xử lý ảnh ở kích thước này.');

    context.fillStyle = '#FAF7F2';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const mimeType = 'image/jpeg';
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error('Không thể nén ảnh trên thiết bị này.'));
      }, mimeType, quality);
    });
    return {
      dataUrl: await readFileAsDataUrl(blob),
      mimeType: blob.type || mimeType,
      width,
      height,
      sizeBytes: blob.size,
    };
  } finally {
    canvas.width = 0;
    canvas.height = 0;
    URL.revokeObjectURL(url);
  }
}
