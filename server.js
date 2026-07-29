import express from 'express';
import cors from 'cors';
import { execSync } from 'child_process';
import { readFileSync, unlinkSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.post('/api/majid-render', (req, res) => {
  try {
    const { pdfBase64 } = req.body;
    if (!pdfBase64) return res.status(400).json({ error: 'Missing pdfBase64' });

    const tmpPdf = join(tmpdir(), randomBytes(8).toString('hex') + '.pdf');
    writeFileSync(tmpPdf, Buffer.from(pdfBase64, 'base64'));

    const tmpPng = join(tmpdir(), randomBytes(8).toString('hex'));
    execSync(`pdftoppm -png -r 300 -scale-to-x 1830 -scale-to-y 2526 "${tmpPdf}" "${tmpPng}"`);
    const renderedPng = tmpPng + '-1.png';

    const finalPng = join(tmpdir(), randomBytes(8).toString('hex') + '.png');
    execSync(`convert "${renderedPng}" -rotate -90 -threshold 50% "${finalPng}"`);

    const imageBase64 = readFileSync(finalPng).toString('base64');

    unlinkSync(tmpPdf);
    unlinkSync(renderedPng);
    unlinkSync(finalPng);

    res.json({ image: imageBase64 });
  } catch (error) {
    console.error('Majid render error:', error);
    res.status(500).json({ error: 'Failed to render PDF' });
  }
});

app.listen(3001, () => {
  console.log('Dev PDF server listening on http://localhost:3001');
});
