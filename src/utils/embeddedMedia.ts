/** Keep legacy URLs in storage. Only embedded bytes can render as family media. */
export function embeddedMediaSource(source: string | undefined, kind: 'image' | 'audio'): string | undefined {
  if (source?.slice(0, 11).toLowerCase() === `data:${kind}/`) return source;
  return undefined;
}
export const EXTERNAL_MEDIA_MESSAGE = 'Đường dẫn gốc được giữ trong bản sao lưu. Tệp ngoài không được tải trong Bản Quà Tặng.';
