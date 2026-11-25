export async function compressImageFile(
  file: File,
  maxDimension = 1200,
  quality = 0.82
): Promise<{ dataUrl: string; mimeType: string; width: number; height: number; sizeBytes: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không thể đọc tệp hình ảnh đã chọn.'));
    reader.onload = () => {
      const result = reader.result as string;
      if (!file.type.startsWith('image/')) {
        resolve({
          dataUrl: result,
          mimeType: file.type || 'application/octet-stream',
          width: 0,
          height: 0,
          sizeBytes: file.size,
        });
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error('Định dạng hình ảnh không hợp lệ hoặc bị hỏng.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({
            dataUrl: result,
            mimeType: file.type,
            width: img.width,
            height: img.height,
            sizeBytes: file.size,
          });
          return;
        }

        ctx.fillStyle = '#FAF7F2';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const outputMime = 'image/jpeg';
        const compressedDataUrl = canvas.toDataURL(outputMime, quality);
        const approxSizeBytes = Math.round((compressedDataUrl.length * 3) / 4);

        resolve({
          dataUrl: compressedDataUrl,
          mimeType: outputMime,
          width,
          height,
          sizeBytes: approxSizeBytes,
        });
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  });
}

export async function ensureBase64DataUrl(urlOrData: string): Promise<string> {
  if (!urlOrData) return '';
  if (urlOrData.startsWith('data:')) return urlOrData;

  try {
    const response = await fetch(urlOrData);
    if (!response.ok) return urlOrData;
    const blob = await response.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : urlOrData);
      reader.onerror = () => resolve(urlOrData);
      reader.readAsDataURL(blob);
    });
  } catch {
    return urlOrData;
  }
}
