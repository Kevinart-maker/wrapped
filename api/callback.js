// Step 2: X sends the user back here with a code. Swap it for a short-lived token.
const { seal, open, cookies, setCookie, redirectUri } = require('./_lib');

module.exports = async (req, res) => {
  const back = q => { res.statusCode = 302; res.setHeader('Location', '/?' + q); res.end(); };
  const url = new URL(req.url, 'https://x');
  const code = url.searchParams.get('code'), state = url.searchParams.get('state');
  if (url.searchParams.get('error')) return back('x=denied');
  const p = open(cookies(req).xw_pkce || '');
  if (!code || !p || p.state !== state) return back('x=error');
  try {
    const basic = Buffer.from(`${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`).toString('base64');
    const r = await fetch('https://api.x.com/2/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${basic}` },
      body: new URLSearchParams({
        grant_type: 'authorization_code', code, redirect_uri: redirectUri(req),
        code_verifier: p.verifier, client_id: process.env.X_CLIENT_ID,
      }),
    });
    const t = await r.json();
    if (!r.ok || !t.access_token) return back('x=error');
    // token lives in an encrypted, httpOnly cookie for 2 hours. Nothing is stored on a server.
    setCookie(res, 'xw_s', seal({ at: t.access_token, exp: Date.now() + 2 * 3600e3 }), 7200);
    setCookie(res, 'xw_pkce', '', 0);
    back('x=ok');
  } catch (e) { back('x=error'); }
};
