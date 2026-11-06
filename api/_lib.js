// shared helpers: encrypted cookies (AES-256-GCM), no database
const crypto = require('crypto');

const key = () => crypto.createHash('sha256')
  .update(process.env.SESSION_SECRET || process.env.X_CLIENT_SECRET || 'dev-only').digest();

function seal(obj) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64url');
}
function open(str) {
  try {
    const b = Buffer.from(str, 'base64url');
    const d = crypto.createDecipheriv('aes-256-gcm', key(), b.subarray(0, 12));
    d.setAuthTag(b.subarray(12, 28));
    const obj = JSON.parse(Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8'));
    return obj.exp && obj.exp < Date.now() ? null : obj;
  } catch (e) { return null; }
}
function cookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => {
    const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = p.slice(i + 1).trim();
  });
  return out;
}
function setCookie(res, name, value, maxAge) {
  const c = `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
  const prev = res.getHeader('Set-Cookie');
  res.setHeader('Set-Cookie', prev ? [].concat(prev, c) : [c]);
}
const redirectUri = req =>
  process.env.X_REDIRECT_URI || `https://${req.headers['x-forwarded-host'] || req.headers.host}/api/callback`;

module.exports = { seal, open, cookies, setCookie, redirectUri };
