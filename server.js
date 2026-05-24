require('dotenv').config();
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// ─── Health check ───────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ ok: true, anthropic: !!process.env.ANTHROPIC_KEY, supabase: !!process.env.SB_URL });
});

// ─── Proxy: Anthropic ──────────────────────────────────
app.post('/api/anthropic/messages', async (req, res) => {
  if (!process.env.ANTHROPIC_KEY) {
    return res.status(400).json({ error: { message: 'ANTHROPIC_KEY no configurada en el servidor' } });
  }
  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });
    const data = await resp.json();
    res.status(resp.status).json(data);
  } catch (e) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// ─── Proxy: Supabase REST API ──────────────────────────
app.all('/api/supabase/*', async (req, res) => {
  const path = req.params[0] || req.url.replace('/api/supabase/', '');
  const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  try {
    const resp = await fetch(`${process.env.SB_URL}/rest/v1/${path}${qs}`, {
      method: req.method,
      headers: {
        'apikey': process.env.SB_KEY,
        'Authorization': 'Bearer ' + process.env.SB_KEY,
        'Content-Type': 'application/json',
        'Prefer': req.headers['x-prefer'] || 'return=representation'
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined
    });
    const text = await resp.text();
    res.status(resp.status).set(resp.headers).send(text);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`IRIS Backend corriendo en http://localhost:${PORT}`);
});
