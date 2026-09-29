import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

// Server-side Gemini API client
const ai = new GoogleGenAI({});

// API route for deep Multimodal Scene Analysis
app.post('/api/gemini/analyze', async (req, res) => {
  try {
    const { imageBase64, language = 'ar', detectedLabels = [] } = req.body;

    if (!imageBase64) {
      res.status(400).json({ error: 'Missing imageBase64 parameter' });
      return;
    }

    // Clean base64 header
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const promptText = language === 'ar'
      ? `أنت العين الذكية لروبوت حقيقي (RoboVision AI). انظر إلى هذا المشهد الملتقط من كاميرا الروبوت.
الأجسام المكتشفة أولياً عبر الرؤية الحاسوبية هي: [${detectedLabels.join(', ')}].
قدّم تحليلاً ذكياً وموجزاً للغاية في فقرة واحدة من جملتين إلى 3 جمل باللغة العربية الفصحى يصف:
1. ما يراه الروبوت أمامه وطبيعة البيئة.
2. هل يوجد أشخاص أو عقبات أو أهداف قريبة.
3. توصية أمان سريعة لحركة الروبوت.`
      : `You are the smart eye of a robot (RoboVision AI). Analyze this camera snapshot.
Detected objects: [${detectedLabels.join(', ')}].
Provide a concise 2-sentence scene summary and safety recommendation.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: promptText },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: cleanBase64,
              },
            },
          ],
        },
      ],
    });

    res.json({
      success: true,
      analysis: response.text || 'تم فحص المشهد بنجاح.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Scene analysis error';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RoboVision AI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
