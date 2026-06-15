const { t } = require('./i18n');

const DEFAULT_MODEL = 'gemini-2.5-flash';
const FALLBACK_MODEL = 'gemini-2.5-flash-lite';
const MAX_HISTORY = 20;

function buildContents(messages) {
  const recent = messages.slice(-MAX_HISTORY);
  return recent.map((msg) => ({
    role: msg.role === 'model' ? 'model' : 'user',
    parts: [{ text: String(msg.text || '') }],
  }));
}

function buildGenerationConfig(model) {
  const config = {
    temperature: 0.8,
    maxOutputTokens: 1024,
  };

  if (model === 'gemini-2.5-flash') {
    config.thinkingConfig = { thinkingBudget: 0 };
  }

  return config;
}

function isQuotaError(status, message) {
  if (status === 429) return true;
  const text = String(message || '').toLowerCase();
  return text.includes('quota') || text.includes('rate limit') || text.includes('resource_exhausted');
}

function formatApiError(message, locale) {
  const text = String(message || '');
  if (isQuotaError(0, text)) {
    const retry = text.match(/retry in ([\d.]+)s/i);
    const wait = retry
      ? t('geminiQuotaWait', locale, { n: Math.ceil(Number(retry[1])) })
      : '';
    return t('geminiQuota', locale, { wait });
  }
  if (text.includes('shut down') || text.includes('deprecated') || text.includes('not found')) {
    return t('geminiModelUnavailable', locale);
  }
  return text;
}

async function callModel(apiKey, model, messages) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: buildContents(messages),
      generationConfig: buildGenerationConfig(model),
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data?.error?.message || `API ${res.status}`;
    return { ok: false, status: res.status, error: msg, quota: isQuotaError(res.status, msg) };
  }

  const text = data?.candidates?.[0]?.content?.parts
    ?.map((p) => p.text || '')
    .join('')
    .trim();

  if (!text) {
    return { ok: false, status: res.status, error: 'empty', quota: false };
  }

  return { ok: true, text, model };
}

async function sendMessage(apiKey, messages, locale) {
  const key = String(apiKey || '').trim();
  if (!key) {
    return { ok: false, error: t('geminiApiKeyMissing', locale) };
  }

  if (!Array.isArray(messages) || !messages.length) {
    return { ok: false, error: t('geminiEmptyMessage', locale) };
  }

  try {
    let result = await callModel(key, DEFAULT_MODEL, messages);

    if (!result.ok && result.quota && FALLBACK_MODEL !== DEFAULT_MODEL) {
      result = await callModel(key, FALLBACK_MODEL, messages);
    }

    if (!result.ok) {
      const err = result.error === 'empty'
        ? t('geminiNoResponse', locale)
        : formatApiError(result.error, locale);
      return { ok: false, error: err };
    }

    return { ok: true, text: result.text };
  } catch (err) {
    return { ok: false, error: err.message || t('geminiConnectionError', locale) };
  }
}

module.exports = { sendMessage };
