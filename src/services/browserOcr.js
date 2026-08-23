// src/services/browserOcr.js
// Local browser OCR engine using self-hosted Tesseract.js assets.
// No external CDN. Data stays on the user's device.

let workerPromise = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      if (!window.Tesseract) {
        throw new Error('Tesseract.js is not loaded');
      }

      const worker = await window.Tesseract.createWorker({
        workerPath: '/ocr/tesseract/worker.min.js',
        corePath: '/ocr/tesseract/tesseract-core.wasm.js',
        langPath: '/ocr/tesseract',
        gzip: false,
        cachePath: 'browser',
      });

      await worker.loadLanguage('eng');
      await worker.initialize('eng');

      await worker.setParameters({
        preserve_interword_spaces: '1',
      });

      return worker;
    })();
  }

  return workerPromise;
}

function preprocessImage(imageSrc) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 1800;
      let width = img.width;
      let height = img.height;

      if (Math.max(width, height) > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        const binary = gray > 128 ? 255 : 0;
        data[i] = data[i + 1] = data[i + 2] = binary;
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load image for preprocessing'));
    img.src = imageSrc;
  });
}

export async function runBrowserOcr(dataUrl, options = {}) {
  const processedDataUrl = await preprocessImage(dataUrl);

  const worker = await getWorker();

  const {
    psm = '6',
    whitelist = '',
  } = options;

  const params = {};

  if (psm) params.tessedit_pageseg_mode = psm;
  if (whitelist) params.tessedit_char_whitelist = whitelist;

  if (Object.keys(params).length > 0) {
    await worker.setParameters(params);
  }

  const { data: { text } } = await worker.recognize(processedDataUrl);

  if (whitelist) {
    await worker.setParameters({ tessedit_char_whitelist: '' });
  }

  return text || '';
}
