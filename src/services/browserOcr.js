let ocrPromise = null;

function ensureModuleGlobal() {
  if (typeof window !== 'undefined' && !window.Module) {
    window.Module = {};
  }
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load OCR image'));
    img.src = dataUrl;
  });
}

async function getOcr() {
  if (!ocrPromise) {
    ensureModuleGlobal();

    ocrPromise = import('@paddlejs-models/ocr').then(async (ocr) => {
      await ocr.init();
      return ocr;
    });
  }

  return ocrPromise;
}

export async function runBrowserOcr(dataUrl) {
  const ocr = await getOcr();
  const img = await loadImage(dataUrl);
  const result = await ocr.recognize(img);

  return result?.text || '';
}
