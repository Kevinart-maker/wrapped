// Step 3: read the user's own posts for the past year and turn them into slides
const { open, cookies } = require('./_lib');

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const API = 'https://api.x.com/2';
const MAX_PAGES = 32; // 32 x 100 = the 3,200 most recent posts X lets us read

async function xget(path, params, at) {
  const r = await fetch(`${API}${path}?${new URLSearchParams(params)}`, { headers: { Authorization: `Bearer ${at}` } });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) { console.error('x-api', path, r.status, JSON.stringify(body).slice(0, 300)); const e = new Error('x'); e.status = r.status; throw e; }
  return body;
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store');
  const send = (code, obj) => { res.statusCode = code; res.end(JSON.stringify(obj)); };
  const s = open(cookies(req).xw_s || '');
  if (!s) return send(401, { error: 'signed_out' });
  const url = new URL(req.url, 'https://x');
  let tz = url.searchParams.get('tz') || 'UTC';
  try { new Intl.DateTimeFormat('en', { timeZone: tz }); } catch (e) { tz = 'UTC'; }

  try {
    const me = (await xget('/users/me', { 'user.fields': 'username' }, s.at)).data;
    const since = new Date(Date.now() - 365 * 864e5);
    const posts = []; const names = {};
    let token, truncated = false;
    for (let i = 0; i < MAX_PAGES; i++) {
      const params = {
        max_results: '100', exclude: 'retweets', start_time: since.toISOString(),
        'tweet.fields': 'created_at,public_metrics,in_reply_to_user_id,referenced_tweets',
        expansions: 'in_reply_to_user_id', 'user.fields': 'username',
      };
      if (token) params.pagination_token = token;
      const page = await xget(`/users/${me.id}/tweets`, params, s.at);
      (page.data || []).forEach(t => posts.push(t));
      (page.includes?.users || []).forEach(u => { names[u.id] = u.username; });
      token = page.meta?.next_token;
      if (!token) break;
      if (i === MAX_PAGES - 1) truncated = true;
    }
    if (!posts.length) return send(200, { empty: true, handle: me.username });

    const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' });
    const days = new Set(); const hours = new Array(24).fill(0); const replies = {};
    let top = null, replyCount = 0;
    posts.forEach(t => {
      const parts = Object.fromEntries(fmt.formatToParts(new Date(t.created_at)).map(p => [p.type, p.value]));
      days.add(`${parts.year}-${parts.month}-${parts.day}`); hours[+parts.hour]++;
      const isReply = !!t.in_reply_to_user_id;
      if (isReply) {
        replyCount++;
        if (t.in_reply_to_user_id !== me.id) replies[t.in_reply_to_user_id] = (replies[t.in_reply_to_user_id] || 0) + 1;
      } else if (!top || t.public_metrics.like_count > top.public_metrics.like_count) top = t;
    });
    // longest run of consecutive days with a post
    const sorted = [...days].sort(); let best = 1, run = 1;
    for (let i = 1; i < sorted.length; i++) {
      const gap = (Date.parse(sorted[i]) - Date.parse(sorted[i - 1])) / 864e5;
      run = gap === 1 ? run + 1 : 1; if (run > best) best = run;
    }
    const hr = hours.indexOf(Math.max(...hours));
    const hourLabel = (hr % 12 || 12) + (hr < 12 ? 'am' : 'pm');
    const perDay = Math.max(1, Math.round(posts.length / Math.max(1, Math.min(365, (Date.now() - Math.min(...posts.map(p => +new Date(p.created_at)))) / 864e5))));
    const [pid, pcount] = Object.entries(replies).sort((a, b) => b[1] - a[1])[0] || [];
    const person = pid && names[pid];

    const night = hr >= 22 || hr < 4, early = hr >= 4 && hr < 8;
    const persona = best >= 30 ? ['The Streaker', 'Showing up every single day.']
      : posts.length > 3000 ? ['The Firehose', 'Always something to say.']
      : replyCount / posts.length > 0.6 ? ['The Conversationalist', 'Most of your year was talking with people.']
      : night ? ['The Night Owl', 'Your best thoughts show up after dark.']
      : early ? ['The Early Bird', 'First one online, every day.']
      : ['The Regular', 'Steady, present, part of the conversation.'];

    const slides = [
      { c: 'purple', tag: 'Posts', big: posts.length.toLocaleString('en-GB') + (truncated ? '+' : ''), count: posts.length,
        line: `posts and replies this year. About <strong>${perDay} a day</strong>.` },
      { c: 'blue', tag: 'Busiest hour', big: hourLabel, line: night ? 'is when you show up the most. Night owl confirmed.' : 'is when you show up the most.' },
      { c: 'pink', tag: 'Streak', big: best === 1 ? '1 day' : `${best} days`, line: 'in a row with a post.' },
    ];
    if (top) {
      const txt = top.text.replace(/https?:\/\/\S+/g, '').trim();
      slides.push({ c: 'purple', tag: 'Top post', quote: esc(txt.length > 90 ? txt.slice(0, 87) + '...' : txt || 'Your top post'),
        line: `<strong>${top.public_metrics.like_count.toLocaleString('en-GB')} likes</strong>. Your most loved post of the year.` });
    } else slides.push({ c: 'purple', tag: 'Replies', big: String(replyCount), count: replyCount, line: 'replies this year. You love a conversation.' });
    if (person) slides.push({ c: 'blue', tag: 'Your person', big: String(pcount), count: pcount,
      line: `replies to <strong>@${esc(person)}</strong>. You two never stopped talking.` });
    else slides.push({ c: 'blue', tag: 'Your voice', big: String(posts.length - replyCount), count: posts.length - replyCount, line: 'original posts. All you.' });
    slides.push({ c: 'pink', tag: 'Your year', quote: persona[0], line: persona[1], end: true });

    send(200, { handle: me.username, slides, share: `My X Wrapped: ${persona[0]}. ${posts.length.toLocaleString('en-GB')} posts, busiest at ${hourLabel}, a ${best} day streak.`, truncated });
  } catch (e) {
    if (e.status === 401) return send(401, { error: 'signed_out' });
    if (e.status === 402 || e.status === 403) return send(403, { error: 'no_access' });
    if (e.status === 429) return send(429, { error: 'rate_limited' });
    send(502, { error: 'failed' });
  }
};
