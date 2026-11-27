import express from 'express';
import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { GEMINI_DISABLED_MESSAGE, isGeminiEnabled } from './src/services/aiBiographyAvailability';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const PORT = Number(process.env.PORT) || 3000;

  const apiKey = process.env.GEMINI_API_KEY;
  const geminiEnabled = isGeminiEnabled(process.env.GEMINI_BIOGRAPHY_ENABLED);
  const ai = geminiEnabled && apiKey
    ? new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } })
    : undefined;

  // AI Biography Generation API endpoint
  app.post('/api/biography/generate', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!geminiEnabled) {
      res.status(403).json({ error: GEMINI_DISABLED_MESSAGE });
      return;
    }
    next();
  }, express.json({ limit: '10mb' }), async (req, res) => {
    try {
      const {
        fullName,
        gender,
        commonName,
        tabooName,
        courtesyName,
        alias,
        isLiving,
        birthDateText,
        birthPlace,
        deathDateText,
        deathPlace,
        ancestralHome,
        residence,
        occupation,
        generation,
        clanRole,
        branchName,
        merits,
        notes,
        events,
        existingBiography,
      } = req.body ?? {};

      if (!fullName || typeof fullName !== 'string') {
        return res.status(400).json({ error: 'Tên nhân vật không được để trống.' });
      }

      if (!ai) {
        return res.status(500).json({
          error:
            'Chưa phát hiện GEMINI_API_KEY trên môi trường máy chủ. Vui lòng kiểm tra khóa trong bảng điều khiển Cài đặt > Secrets.',
        });
      }

      const prompt = `Bạn là một nhà biên khảo phả hệ và sử gia chuyên trách về văn hóa gia tộc Việt Nam truyền thống. Hãy viết một đoạn tiểu sử hành trạng (biography) trang trọng, súc tích, thấm đượm đạo lý uống nước nhớ nguồn và bản sắc gia phong cho nhân vật sau:

- Họ và tên: ${fullName}
- Giới tính: ${gender === 'female' ? 'Nữ' : 'Nam'}
${commonName ? `- Tên thường gọi: ${commonName}` : ''}
${tabooName ? `- Tên húy: ${tabooName}` : ''}
${courtesyName ? `- Tên tự: ${courtesyName}` : ''}
${alias ? `- Bí danh: ${alias}` : ''}
- Thế hệ: ${generation ? `Đời thứ ${generation}` : 'Chưa rõ đời'}
${branchName ? `- Chi họ: ${branchName}` : ''}
${clanRole ? `- Vai vế trong dòng họ: ${clanRole}` : ''}
- Trạng thái: ${isLiving ? 'Còn sống' : 'Đã tạ thế'}
${birthDateText ? `- Ngày sinh: ${birthDateText}` : ''}
${birthPlace ? `- Nơi sinh: ${birthPlace}` : ''}
${ancestralHome ? `- Nguyên quán: ${ancestralHome}` : ''}
${residence ? `- Nơi cư trú: ${residence}` : ''}
${occupation ? `- Nghề nghiệp / Học vị: ${occupation}` : ''}
${!isLiving && deathDateText ? `- Ngày mất: ${deathDateText}` : ''}
${!isLiving && deathPlace ? `- Nơi an táng / Mộ phần: ${deathPlace}` : ''}
${merits ? `- Công đức & Đóng góp cho dòng họ: ${merits}` : ''}
${notes ? `- Ghi chú gia phả: ${notes}` : ''}
${
  Array.isArray(events) && events.length > 0
    ? `- Các mốc sự kiện quan trọng trong đời:\n${events
        .map(
          (e: { title?: string; dateText?: string; location?: string; description?: string }) =>
            `  + ${e.dateText ? `[${e.dateText}] ` : ''}${e.title || 'Sự kiện'}${
              e.location ? ` tại ${e.location}` : ''
            }: ${e.description || ''}`
        )
        .join('\n')}`
    : ''
}
${
  existingBiography && typeof existingBiography === 'string' && existingBiography.trim().length > 0
    ? `- Bản thảo thô ban đầu của người dùng:\n"${existingBiography.trim()}"`
    : ''
}

Yêu cầu định dạng và văn phong:
1. Sử dụng văn phong tiếng Việt gia phả trang trọng, truyền thống, chuẩn mực, kính cẩn với tiền nhân.
2. Tổng hợp mạch lạc theo tiến trình cuộc đời: từ cội nguồn xuất thân, chí hướng học tập/lập nghiệp, gia đình, công đức và những di huấn để lại cho con cháu.
3. Dung lượng: từ 2 đến 3 đoạn văn súc tích, hoàn chỉnh (khoảng 150 – 280 từ).
4. Không dùng ngôi thứ nhất (không xưng tôi/chúng tôi). Dùng danh xưng trang trọng ("Cụ", "Ông", "Bà", "Liệt sĩ"... tương ứng với thông tin đã cung cấp).
5. Chỉ trả về trực tiếp đoạn văn tiểu sử hoàn chỉnh, không kèm lời chào hỏi, tiêu đề phụ hay giải thích của AI.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction:
            'Bạn là chuyên gia biên khảo gia phả, tộc phả và ký sự dòng họ Việt Nam, am hiểu lễ nghi, văn hóa thờ phụng tổ tiên và ngôn ngữ ký sự truyền thống.',
        },
      });

      const generatedBio = response.text?.trim() || '';
      return res.json({ biography: generatedBio });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Error generating biography with Gemini:', msg);
      return res.status(500).json({
        error: `Lỗi khi tạo tiểu sử: ${msg}`,
      });
    }
  });

  // In production, serve built dist files; in development, mount Vite's connect middleware
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        ws: { server: httpServer },
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    const address = httpServer.address();
    if (address && typeof address === 'object') {
      console.log(`Server running on http://0.0.0.0:${address.port}`);
    }
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
