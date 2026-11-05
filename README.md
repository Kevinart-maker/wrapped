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

## Going live with the X API (plan)

1. Create an app in the X developer portal and turn on OAuth 2.0 (Authorization Code with PKCE). Set the callback to `https://YOUR-DOMAIN/api/auth/callback`.
2. Add serverless functions in `/api` on Vercel: `login` (redirect to X), `callback` (swap the code for a token, keep it in an encrypted cookie), `wrapped` (fetch the user's posts and return the slide numbers).
3. Keep secrets in Vercel env vars (see `.env.example`). Never in the browser.
4. Replace `SLIDES` with the response from `/api/wrapped`.

## Design rules

Follows Apple's Human Interface Guidelines: 44pt targets, one primary button per screen, AA contrast, Reduce Motion respected, no auto-dismissing UI.
