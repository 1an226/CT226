import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from 'canvas';
import sharp from 'sharp';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pdfBase64 } = req.body;
    if (!pdfBase64) {
      return res.status(400).json({ error: 'Missing pdfBase64' });
    }

    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    const pdf = await getDocument({ data: pdfBuffer }).promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: 3.0 });
    const canvas = createCanvas(viewport.width, viewport.height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport }).promise;

    const pngBuffer = canvas.toBuffer('image/png');

    const finalBuffer = await sharp(pngBuffer)
      .rotate(-90, { background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .threshold(128)
      .png()
      .toBuffer();

    const finalBase64 = finalBuffer.toString('base64');
    res.status(200).json({ image: finalBase64 });
  } catch (error) {
    console.error('Majid render error:', error);
    res.status(500).json({ error: 'Failed to render PDF' });
  }
}
