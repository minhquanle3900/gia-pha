export const GEMINI_DISABLED_MESSAGE = 'AI chưa được kích hoạt trong Bản Quà Tặng.';

export function isGeminiEnabled(value: string | undefined): boolean {
  return value === 'true';
}
