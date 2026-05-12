import express from 'express';

const router = express.Router();

/**
 * POST /api/probe
 * 後端 proxy：打外部 URL 並回傳 JSON response
 * 用途：API 探索器 bypass CORS（不需 auth，探索的是外部公開 API）
 */
router.post('/', async (req, res) => {
  const { url, method = 'GET', authType = 'none', authValue = '' } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ success: false, error: 'url 為必填' });
  }

  const headers = { Accept: 'application/json, text/plain, */*' };
  if (authType === 'bearer' && authValue) {
    headers.Authorization = `Bearer ${authValue}`;
  } else if (authType === 'api_key' && authValue) {
    headers['X-API-Key'] = authValue;
  } else if (authType === 'basic' && authValue) {
    headers.Authorization = `Basic ${Buffer.from(authValue).toString('base64')}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      method: method.toUpperCase(),
      headers,
      signal: controller.signal,
    });
    clearTimeout(timer);

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      // 嘗試修復常見的非標準 JSON（例如 leading zeros: 000 → 0）
      try {
        const fixed = text.replace(/:\s*0{2,}(?=[\s,\}\]])/g, ': 0');
        data = JSON.parse(fixed);
      } catch {
        // 非 JSON，以純文字回傳
        data = { _raw: text.slice(0, 5000) };
      }
    }

    res.json({ success: true, data, status: response.status });
  } catch (error) {
    clearTimeout(timer);
    res.json({
      success: false,
      error: error.name === 'AbortError' ? '連線逾時（10s）' : error.message,
    });
  }
});

export default router;
