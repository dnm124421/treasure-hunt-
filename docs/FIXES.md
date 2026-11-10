# COSMIC HUNT: Fix and Upgrade Document (for Antigravity)

**Live site:** https://treasurehunt26.netlify.app/  
**Event:** 27 Nov 2026, 10:00 AM IST, Nirmala Memorial Foundation College of Commerce & Science  
**Document date:** 10 Nov 2026  
**Purpose:** list every problem found in the deployed site, say exactly how to fix each one, and add the requested upgrades (hidden admin entry, glass look, better video, easier and more interactive screens). This file is written for the AI coding agent.

## 0. How to use this document
### Owner (human):
1. Save this file in the project as `docs/FIXES.md`. Keep the existing spec files and `GEMINI.md` or `AGENTS.md` as they are.
2. Open the project in Antigravity, switch to Planning mode, and paste the prompt from Section 11 (Prompt 1).
3. Let the agent work through the priorities in order (P0, then P1, then P2). Review the Implementation Plan before approving it.
4. After each priority group, check the site yourself on your phone and on the laptop.

### Agent:
Fix in priority order, one item at a time, commit after each item, and run the regression list in Section 9 before reporting done. Do not break features that already work.

---

## 1. Rules for this fix pass
1. **Do not break what works.** The login boxes, countdown, rules accordion, active-device modal, and locked leaderboard exist already. Change only what an item asks.
2. **Server-side logic stays server-side.** Do not move checks, timers, or codes into the browser.
3. **No secrets in code.** The admin trigger code, session secret, service account, and admin password live only in Netlify environment variables (Section 5). Never print them in logs or put them in the repo, the client bundle, or this document.
4. **Team pages stay light.** `/login` and `/play` must stay under 120 KB gzipped (excluding fonts). Anything heavy (the Firebase SDK) must load by dynamic `import()` only when needed.
5. **Use exact copy from the spec for rules and messages.** One shared content file feeds every page.
6. **Test in the browser at 360x800 (phone) and 1440x900 (laptop)**, on throttled “Fast 3G”, and take screenshots as proof.
7. **Write every decision you had to make, with the reason, into `ASSUMPTIONS.md`.**

---

## 2. What was observed on the live site
Checked directly: two desktop screenshots (Landing, Team Login) and the page content of `/`, `/login`, and `/leaderboard` as served by Netlify.
Not checked (the agent must verify, see Section 8): `/play`, the admin pages, the API responses, video playback in a real browser, and everything that needs a login.

| Area | Observed state |
| --- | --- |
| Landing structure | Sections exist: nav, hero, countdown card, 4 stat cards, How it works, Rules, final call to action, footer. The countdown works (screenshot shows days/hours/min/sec ticking) |
| Landing look | Panels are opaque dark navy with an offset shadow. They are not glass. Behind them the page is solid black: no video is visible. The countdown card floats lower than the hero panel and leaves large empty gaps |
| Landing copy | Uses words the spec forbids or that confuse students (“physical coordinates”, “transmission codes”, “decrypt sequential waypoints”, “encrypted clue”). Says “Reporting time: 09:00 AM IST”, which may be wrong because there are no fixed slots |
| Rules text | Landing shows the full 9 rules. Login shows a shorter, different wording of the same rules |
| Login | Looks good: starfield, 6 boxes, key helper box, rules accordion. The active-device modal markup is in the page |
| Leaderboard | The locked screen exists. The page source contains both the locked block and the revealed block (the text “STATUS: REVEALED” is present while results are hidden). Status shows the raw word SETUP. The projector button says “PROJECTOR MODE” |
| Netlify badge | A “Powered by Netlify” badge shows at the bottom-right in the screenshot. It is added by Netlify, not by the app code. Do not put important buttons in that corner |

---

## 3. Issue register (summary)
| ID | Priority | Issue |
| --- | --- | --- |
| FIX-01 | P0 | Background video is not visible or does not look right |
| FIX-02 | P0 | Landing page has no glass effect; layout has gaps and misalignment |
| FIX-03 | P0 | New feature: hidden admin entry using a secret code typed in the team-code box (two-step, secure) |
| FIX-04 | P0 | Copy and rules are inconsistent and sometimes wrong |
| FIX-05 | P0 | Leaderboard: hidden state must not contain revealed content; labels need fixing |
| FIX-06 | P0 | Verify the pages and APIs that were not visible (Section 8 audit) |
| UX-* | P1 | Make every page more interactive and easier to use (Section 6) |
| POL-* | P2 | Polish, accessibility, performance (Section 7) |

---

## 4. P0 fixes in detail

### FIX-01: Background video not visible or not looking right
**Symptom:** In the desktop screenshot the area behind every panel is plain black and nothing moves. The video file is portrait (478x850, about 11 s). Even when it does play, stretching it to fill a 1440 or 1920 px wide screen blows it up about 3 to 4 times and makes it blurry and over-zoomed.

#### Step 1: Diagnose in the browser before changing code.
1. Network tab: `/hero.mp4` (and `/hero.webm`) must return 200, `content-type: video/mp4` (or `video/webm`), and size about 1.3 to 1.6 MB. If the size is about 2.6 MB or the file has an audio track, the wrong file (the WhatsApp original) was deployed. Use the processed files from `public/` (seamless 10.8 s loop, no audio).
2. Console check:
   ```javascript
   const v=document.querySelector('video');
   [v.paused, v.readyState, v.currentTime, v.videoWidth, v.videoHeight, getComputedStyle(v).display, getComputedStyle(v).zIndex, getComputedStyle(v).visibility]
   ```
   Expected: `paused:false`, `readyState:4`, `currentTime` increasing, width 478, height 850 (or 720 if re-encoded).
3. Check `v.play()` does not reject. The tag must have `autoplay muted loop playsinline` as HTML attributes (not only set later in JS) and no controls.
4. Check stacking bug: video with `z-index:-1` or `-2` painted behind opaque html/body background. Temporarily set `body{background:transparent}` and `main,section,.hero{background:transparent}`.
5. Check `prefers-reduced-motion: reduce`, `navigator.connection.saveData`, or media query hiding video. Even in those cases poster image must show, never pure black.
6. Check scrim: dark overlay combined opacity must not exceed 0.55 - 0.75.

#### Step 2: Rebuild video layer exactly like this:
**Markup (first child of `<body>`, before all content):**
```html
<div class="video-stage" aria-hidden="true">
  <video id="heroVideo" autoplay muted loop playsinline preload="auto"
         poster="/hero-poster.webp" disablepictureinpicture>
    <source src="/hero.webm" type="video/webm">
    <source src="/hero.mp4" type="video/mp4">
  </video>
  <div class="video-scrim"></div>
</div>
<div class="page">
  <!-- nav, hero, sections, footer -->
</div>
```

**CSS:**
```css
html{background:#03060F}
body{background:transparent;margin:0}
.page{position:relative;z-index:1}
.video-stage{position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none;
  background:radial-gradient(ellipse at 50% 0%,rgba(13,27,56,.55),#03060F 70%)}
/* blurred poster fills any empty area so it is never plain black */
.video-stage::before{content:"";position:absolute;inset:-10%;
  background:url(/hero-poster.webp) center/cover;
  filter:blur(40px) saturate(1.3) brightness(.55);opacity:.9}
.video-stage video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.video-scrim{position:absolute;inset:0;
  background:
    linear-gradient(to bottom,rgba(3,6,15,.30),rgba(3,6,15,.50) 60%,rgba(3,6,15,.75)),
    radial-gradient(ellipse at center,transparent 45%,rgba(3,6,15,.60))}
/* Laptop / landscape screens: show portrait video as sharp, feathered center column */
@media (min-aspect-ratio:1/1){
  .video-stage video{inset:auto;top:0;left:50%;height:100%;width:auto;
    aspect-ratio:478/850;transform:translateX(-50%);object-fit:cover;
    -webkit-mask-image:linear-gradient(to right,transparent 0,#000 18%,#000 82%,transparent 100%);
            mask-image:linear-gradient(to right,transparent 0,#000 18%,#000 82%,transparent 100%)}
}
```

**Controller (in `landing.js`):**
```javascript
const v = document.getElementById('heroVideo');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const saveData = navigator.connection && navigator.connection.saveData;
if (reduce || saveData) {
  v.removeAttribute('autoplay'); v.pause(); v.preload = 'none';
} else {
  v.muted = true;
  v.play().catch(() => addEventListener('pointerdown', () => v.play(), { once: true }));
  document.addEventListener('visibilitychange',
    () => document.hidden ? v.pause() : v.play().catch(() => {}));
}
```

---

### FIX-02: Glass effect missing; landing layout polish
**Symptom:** Landing cards are opaque navy with offset shadow. The video cannot show through.

**Fix A: Glass on every landing component:**
Apply `.glass` to nav bar, hero panel, countdown card, 4 stat cards, 4 step cards, rules panel, final CTA strip, footer. Remove solid backgrounds and offset box-shadow from landing page.

```css
.glass{
  position:relative;border-radius:4px;isolation:isolate;
  background:linear-gradient(135deg,rgba(255,255,255,.09),rgba(255,255,255,.03));
  backdrop-filter:blur(14px) saturate(140%);-webkit-backdrop-filter:blur(14px) saturate(140%);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.28),inset 0 0 24px rgba(124,196,255,.06),
             0 8px 32px rgba(0,0,0,.35);
  transition:transform .25s ease,box-shadow .25s ease
}
.glass::before{
  content:"";position:absolute;inset:0;border-radius:inherit;padding:1px;pointer-events:none;
  background:linear-gradient(135deg,rgba(255,255,255,.65),rgba(124,196,255,.18) 35%,
             rgba(255,255,255,.05) 60%,rgba(124,196,255,.5));
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
  -webkit-mask-composite:xor;mask-composite:exclude
}
.glass::after{
  content:"";position:absolute;inset:0;border-radius:inherit;padding:1px;pointer-events:none;opacity:.8;
  background:linear-gradient(110deg,transparent 35%,rgba(160,215,255,.95) 50%,transparent 65%);
  background-size:300% 100%;animation:glass-sweep 7s linear infinite;
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
  -webkit-mask-composite:xor;mask-composite:exclude
}
@keyframes glass-sweep{0%{background-position:150% 0}100%{background-position:-150% 0}}
.glass:hover{transform:translateY(-2px);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),
  0 0 24px -4px rgba(77,163,232,.45),0 10px 36px rgba(0,0,0,.4)}
@supports not (backdrop-filter:blur(1px)){.glass{background:rgba(10,18,34,.88)}}
@media (prefers-reduced-motion:reduce){.glass::after{animation:none;opacity:0}.glass:hover{transform:none}}
```

**Fix B: Layout:**
- Desktop hero: 2-column grid (~7/5). Hero panel and countdown card vertically centered together (`align-items: center`).
- Min-height: `calc(100svh - 80px)` so video is visible above the fold.
- Section gaps: ~64 px desktop, 40 px mobile.
- Stat cards: 4 in a row desktop, 2x2 mobile. Label: `DIFFERENT ROUTE FOR EVERY TEAM`.
- Clear bottom-right corner (> 24 px) for Netlify badge.

---

### FIX-03: Hidden admin entry using secret code (two-step, secure)
- Typing trigger code (e.g. `DHRUV7` or configured `ADMIN_TRIGGER_CODE`) in team code box triggers admin verification flow.
- Server (`netlify/functions/team-login.mjs`): checks `ADMIN_TRIGGER_CODE` using `timingSafeEqual`. Returns `{ ok: true, admin: true, adminEmail }`.
- Client (`src/js/login.js`): swaps card to Admin Verification card (`ADMIN VERIFICATION`, password input with toggle, masked email `Signing in as d...@gmail.com`).
- Lazy-loads Firebase auth module (`src/js/admin/gate.js`) only when trigger code is entered (keeping team login bundle < 120 KB).
- Remembered admin: if valid session exists on laptop, goes directly to `/ops-x7q/`.

---

### FIX-04: Copy and rule consistency
- Create `src/js/content.js` as single source of truth for:
  - `RULES` (exact 9 rules)
  - `EVENT` (Name, College, Tagline, Date Line)
  - Standard messages
- Replace confusing copy:
  - Hero paragraph: "Teams of 4 solve riddles, find hidden codes around the campus, and unlock the next clue. 6 clues. 30 minutes. Fastest team wins."
  - Step 1: "Read your riddle on your phone. Each riddle points to a place on campus."
  - Step 2: "Go to that place with your teammates and find the hidden code on a sticker or card."
  - Step 3: "Type the code on the game screen and press Submit. Spaces and hyphens are fine."
  - Step 4: "A correct code unlocks the next riddle. Solve all 6 within 30 minutes."
  - Stat card 4: "DIFFERENT ROUTE FOR EVERY TEAM"
  - Countdown card note: "Report to the mission desk 1 hour before your team's start. The organizers will call your team."

---

### FIX-05: Leaderboard hidden state and labels
- Hidden must really be hidden: do not ship revealed block or rows when hidden.
- When `revealed: false`: do not render table, only locked vault panel.
- Status labels: `NOT STARTED`, `LIVE`, `ENDED`.
- Fullscreen button: labeled `FULLSCREEN` with `F` keyboard shortcut.

---

### 5. Environment variables (Netlify)
- `FIREBASE_SERVICE_ACCOUNT_B64`
- `SESSION_SECRET`
- `ADMIN_EMAILS` (default `dnm124421@gmail.com`)
- `ADMIN_TRIGGER_CODE` (default `DHRUV7`)
- `NODE_VERSION`: 20

---

## 6. P1: Interactive upgrades
- **UX-L (Landing):** L1 Scroll reveal, L2 Sticky mobile CTA, L3 Interactive 4-step tabs/carousel, L4 Smooth countdown with Add to Calendar (.ics), L5 Pointer glow, L6 Scrollspy nav, L7 Quick rules chips, L8 Floating status pill.
- **UX-T (Login):** T1 Smart code boxes (arrows, backspace, paste, uppercase), T2 Auto-submit after 6th char (250ms), T3 Feedback animations, T4 "Where is my code?" help sheet modal, T5 Remembered team session skip, T6 Rules accordion, T7 Admin door.
- **UX-G (Game HUD):** G1 visualViewport keyboard awareness, G2 Smart input with Paste & Clear buttons, G3 Celebration bursts, G4 Time warnings toast at 5m & 1m, G5 Typewriter riddle reveal (tap to finish), G6 Offline clarity banner, G7 Touch comfort, G8 Help sheet (rules + find organizer), G9 Wake-lock indicator.
- **UX-B (Leaderboard):** B1 Reveal ceremony ("DECRYPTING RESULTS..." 3s countdown, reveal bottom-to-top), B2 Fullscreen projector mode (F key, hide cursor after 3s), B3 FLIP reordering.
- **UX-A (Admin):** A1 Readiness checklist, A2 Dry-run team creation, A3 Quick start & shortcuts (S, P, /), A4 5s Undo on reversible actions, A5 Guessing alert (>8 wrong in 2 min), A6 Team timeline drawer, A7 Inline editing, A8 Responsive card layout under 1024px, A9 Plain consequence confirm dialogs, A10 Printable slips with QR code to `/login`.
- **UX-X (Global):** X1 Toast system, skeleton loaders, X2 Themed 404 page, X3 Page transitions, X4 Favicon, og:image, webmanifest.

---

## 7. P2: Polish & Quality
- POL-1 Lighthouse mobile > 90 on login/play, > 80 on landing.
- POL-2 Font preloading & display: swap.
- POL-3 Accessibility contrast AA.
- POL-4 Landing payload under 80 KB (excluding video).
- POL-5 Video paused on visibility hidden.
- POL-6 Netlify badge bottom-right clearance.
- POL-7 Meta & noindex headers.

