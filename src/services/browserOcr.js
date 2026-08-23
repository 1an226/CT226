import * as ocr from '@paddlejs-models/ocr';

let initialized = false;

async function initOnce() {
  if (initialized) return;

  // Default models load from Paddle.js CDN.
  // No PO data is sent — only static model files are downloaded.
  await ocr.init();

  initialized = true;
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load OCR image'));
    img.src = dataUrl;
  });
}

export async function runBrowserOcr(dataUrl) {
  await initOnce();

  const img = await loadImage(dataUrl);
  const result = await ocr.recognize(img);

  return result?.text || '';
}
