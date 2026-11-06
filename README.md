# X Wrapped

Your year on X as a flight through a brain. You glide down a synapse, push through the skin of a neuron, stop inside it for one memory, then carry on to the next.

Right now it runs on sample data. The next step is wiring in the real X API (see below).

## Run it

It is one static file, no build step.

```sh
npx serve .
```

Then open the address it prints. Deploys to Vercel as a static site as is.

## Where things are

Everything is in `index.html`, in this order:

1. CSS. The look comes from the Paper hero: `#181818` ground, purple / blue / pink, squircle buttons, Inter.
2. Markup for the landing, the chips, the journey panel.
3. `DATA`: the six slides (`SLIDES`). This is the part the real X data will replace.
4. `LOOK` and `CFG`: colours and every motion number (cruise speed, turn cap, fov...).
5. `NEURONS` laid out on an S-curve, then `init()` builds the scene.
6. `MOTION`: one spline through every neuron. `stepMotion()` moves the camera along it with a soft push-off, steady glide and soft landing. It turns toward a point ahead of it, never blends look-at targets.
7. `FLOW`: slide rendering, Next / Back, enter / exit.
8. `SOUND + HAPTICS`: WebAudio synth plus [web-haptics](https://github.com/lochie/web-haptics). One toggle.
9. `LOOP`: per-frame fades and the membrane wash.

`window.__wrapped.sim(seconds)` runs the motion at a fixed 60fps with no rendering and returns speed and turn-rate per frame. Use it to check for spikes after any change.

## Live X data

Login is OAuth 2.0 + PKCE, read-only (`tweet.read users.read`). Three serverless routes in `/api`:

- `login.js` sends the user to X to approve.
- `callback.js` swaps the code for a token, kept 2 hours in an encrypted httpOnly cookie. Nothing is stored on a server.
- `wrapped.js` reads the last year of the user's own posts (X allows up to the 3,200 most recent) and builds the 6 slides.

Env vars (Vercel): `X_CLIENT_ID`, `X_CLIENT_SECRET`, optional `SESSION_SECRET` (falls back to the client secret) and `X_REDIRECT_URI`.
Callback URL in the X developer portal: `https://YOUR-DOMAIN/api/callback`.

## Design rules

Follows Apple's Human Interface Guidelines: 44pt targets, one primary button per screen, AA contrast, Reduce Motion respected, no auto-dismissing UI.
