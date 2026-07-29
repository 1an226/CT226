import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from '@napi-rs/canvas';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pdfjsWasmDir = join(__dirname, '..', 'node_modules', 'pdfjs-dist', 'wasm') + '/';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pdfBase64 } = req.body;
    if (!pdfBase64) return res.status(400).json({ error: 'Missing pdfBase64' });

    const pdfData = new Uint8Array(Buffer.from(pdfBase64, 'base64'));

    const loadingTask = getDocument({
      data: pdfData,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.7.284/cmaps/',
      standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.7.284/standard_fonts/',
      wasmUrl: pdfjsWasmDir,
    });
    const pdf = await loadingTask.promise;
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
