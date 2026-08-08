import express from 'express';
import cors from 'cors';
import { execSync } from 'child_process';
import { readFileSync, unlinkSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes, createHash } from 'crypto';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ========== MAJID PDF RENDERER ==========
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
    unlinkSync(tmpPdf); unlinkSync(renderedPng); unlinkSync(finalPng);
    res.json({ image: imageBase64 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to render PDF' });
  }
});

// ========== LAGRANGIAN ==========
const lagrangianSessions = new Map();

app.post('/api/lagrangian', async (req, res) => {
  const { action, sessionId, query, body } = req.body || {};

  try {
    // INIT: Login + fetch all data
    if (action === 'init') {
      const { username, password } = req.body;
      const loginRes = await fetch('https://mbnl.ddsolutions.tech/dds-backend/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usr: username, pwd: password, loginOnWeb: true }),
      });
      if (!loginRes.ok) return res.status(401).json({ error: 'DDS login failed' });

      const token = loginRes.headers.get('x-auth-token');
      if (!token) return res.status(401).json({ error: 'No token' });

      const headers = { 'Authorization': `Bearer ${token}`, 'X-Auth-Token': token };
      const [custRes, naivasRes, spRes, depotRes] = await Promise.all([
        fetch('https://mbnl.ddsolutions.tech/dds-backend/api/v1/customer/list', { headers }).then(r => r.json()).catch(() => ({})),
        fetch('https://mbnl.ddsolutions.tech/dds-backend/api/v1/item/listByPrice/Naivas%20Special%20Price', { headers }).then(r => r.json()).catch(() => ({})),
        fetch('https://mbnl.ddsolutions.tech/dds-backend/api/v1/item/listByPrice/Supermarkets%20Price', { headers }).then(r => r.json()).catch(() => ({})),
        fetch('https://mbnl.ddsolutions.tech/dds-backend/api/v1/item/listByPrice/Depot%20Price', { headers }).then(r => r.json()).catch(() => ({})),
      ]);

      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      const sid = createHash('sha256').update(token + Date.now()).digest('hex').substring(0, 16);

      lagrangianSessions.set(sid, {
        token,
        customers: custRes.payload || custRes || [],
        products: {
          NAIVAS: naivasRes.payload || naivasRes || [],
          CLEANSHELF: spRes.payload || spRes || [],
          MAJID: spRes.payload || spRes || [],
          CHANDARANA: spRes.payload || spRes || [],
          QUICKMART: spRes.payload || spRes || [],
          JAZARIBU: depotRes.payload || depotRes || [],
          KHETIA: depotRes.payload || depotRes || [],
        },
        createdAt: Date.now(),
      });

      return res.json({
        success: true,
        sessionId: sid,
        user: {
          name: payload?.auth?.name || 'User',
          branch: payload?.auth?.details?.branch || 'Default',
          userBranches: payload?.auth?.details?.userBranches || [],
        }
      });
    }

    // PROXY DDS
    if (action === 'proxy-dds') {
      const session = lagrangianSessions.get(sessionId);
      if (!session) return res.status(401).json({ error: 'Session expired' });
      const { method, endpoint, data, params } = body || {};
      let url = `https://mbnl.ddsolutions.tech/dds-backend/api/v1${endpoint || ''}`;
      if (params) { const qs = new URLSearchParams(params).toString(); if (qs) url += '?' + qs; }
      const options = {
        method: (method || 'GET').toUpperCase(),
        headers: { 'Authorization': `Bearer ${session.token}`, 'X-Auth-Token': session.token, 'Content-Type': 'application/json' },
      };
      if (data && method?.toUpperCase() !== 'GET') options.body = JSON.stringify(data);
      const response = await fetch(url, options);
      const newToken = response.headers.get('x-auth-token');
      if (newToken) session.token = newToken;
      return res.status(response.status).json(await response.json().catch(() => ({})));
    }

    res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3001, () => console.log('Dev PDF server + Lagrangian on http://localhost:3001'));
