require('dotenv').config();
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// ─── Health check ───────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ ok: true, gemini: !!process.env.GEMINI_KEY, supabase: !!process.env.SB_URL });
});

// ─── Proxy: Gemini (formato compatible con Anthropic) ──
app.post('/api/anthropic/messages', async (req, res) => {
  const key = process.env.GEMINI_KEY;
  if (!key) {
    return res.status(400).json({ error: { message: 'GEMINI_KEY no configurada en el servidor' } });
  }
  try {
    const prompt = req.body.messages?.[0]?.content || '';
    const resp = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + key, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 2000, temperature: 0.7 }
      })
    });
    const gemini = await resp.json();
    if (!resp.ok) {
      return res.status(resp.status).json({ error: { message: gemini.error?.message || 'Gemini API error' } });
    }
    const text = gemini.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    res.json({ content: [{ type: 'text', text }] });
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
    const safeHeaders = {};
    for (const [k, v] of resp.headers) {
      if (['content-type','content-range','cache-control','etag'].includes(k)) safeHeaders[k] = v;
    }
    res.status(resp.status).set(safeHeaders).send(text);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`IRIS Backend corriendo en http://localhost:${PORT}`);
});
