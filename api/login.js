// Step 1: send the user to X to approve read-only access (OAuth 2.0 + PKCE)
const crypto = require('crypto');
const { seal, setCookie, redirectUri } = require('./_lib');

module.exports = (req, res) => {
  if (!process.env.X_CLIENT_ID) { res.statusCode = 500; return res.end('X_CLIENT_ID is not set'); }
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  const state = crypto.randomBytes(16).toString('base64url');
  setCookie(res, 'xw_pkce', seal({ verifier, state, exp: Date.now() + 10 * 60e3 }), 600);
  const url = new URL('https://x.com/i/oauth2/authorize');
  url.search = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.X_CLIENT_ID,
    redirect_uri: redirectUri(req),
    scope: 'tweet.read users.read',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  }).toString();
  res.statusCode = 302; res.setHeader('Location', url.toString()); res.end();
};
