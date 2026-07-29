import { execSync } from 'child_process';
import { readFileSync, unlinkSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pdfBase64 } = req.body;
    if (!pdfBase64) return res.status(400).json({ error: 'Missing pdfBase64' });

    // Write PDF to temp file
    const tmpPdf = join(tmpdir(), randomBytes(8).toString('hex') + '.pdf');
    writeFileSync(tmpPdf, Buffer.from(pdfBase64, 'base64'));

    // Render with pdftoppm (like the terminal)
    const tmpPng = join(tmpdir(), randomBytes(8).toString('hex'));
    execSync(`pdftoppm -png -r 300 -scale-to-x 1830 -scale-to-y 2526 "${tmpPdf}" "${tmpPng}"`);
    const renderedPng = tmpPng + '-1.png';

    // Rotate and threshold with ImageMagick
    const finalPng = join(tmpdir(), randomBytes(8).toString('hex') + '.png');
    execSync(`convert "${renderedPng}" -rotate -90 -threshold 50% "${finalPng}"`);

    // Read and return
    const imageBase64 = readFileSync(finalPng).toString('base64');

    // Cleanup
    unlinkSync(tmpPdf);
    unlinkSync(renderedPng);
    unlinkSync(finalPng);

    res.status(200).json({ image: imageBase64 });
  } catch (error) {
    console.error('Majid render error:', error);
    res.status(500).json({ error: 'Failed to render PDF' });
  }
}
