# COSMIC HUNT: Complete Event + Web App Build Document

**Event:** COSMIC HUNT (college treasure hunt)
**College:** Nirmala Memorial Foundation College of Commerce & Science
**Date and time:** 27 November 2026, 10:00 AM
**Document version:** 1.0 (7 Nov 2026)
**Audience:** the AI coding agent (Antigravity) that will build the website, and the organizer who will run it.
**Build window:** 2 days. Event day: 27 Nov 2026.

---

## 0. How to use this document (read first)

### 0.1 For the owner (human)

1. Create an empty project folder, for example `cosmic-hunt/`.
2. Save this file in the project root as `AGENTS.md` (and also keep a copy as `COSMIC_HUNT_MASTER.md`). If your Antigravity version does not pick up `AGENTS.md` automatically, paste the Kickoff Prompt from Section 19 into the first agent chat and tell it to read this file.
3. Unzip your Stitch design export into a folder named `design-reference/` using this layout:
   - `design-reference/landing/` (the single-page export: `code.html`, `screen.png`)
   - `design-reference/team-login/` (`code.html`, `screen.png`)
   - `design-reference/team-game/` (`code.html`, `screen.png`)
   - `design-reference/leaderboard/` (`code.html`, `screen.png`)
   - `design-reference/admin-live/` (`code.html`, `screen.png`)
   - `design-reference/DESIGN.md` (the design tokens file)
4. Put your hero video in `design-reference/video/` as `hero-original.mp4` (the process to prepare it is in Section 11).
5. Create the Firebase project and the Netlify site (Section 6.5 lists exactly what is needed).
6. **Never put the admin password in any file, in the repo, or in this document.** Create the admin user by hand in the Firebase console (Section 9.2).

### 0.2 For the AI agent (rules you must follow)

- Read this whole document before writing code. It is the single source of truth for the event rules and behavior.
- The files in `design-reference/` are **visual references**. Match their look and layout, but where they contain fake or extra features, **this document wins** (Section 17 lists what must not be built).
- Build in the milestone order of Section 15 and test each milestone against Section 16 before moving on.
- Do not invent features, rules, names, points, or numbers that are not in this document.
- All game logic and checks run on the server (Netlify Functions). The browser only displays state and sends actions.
- Optimize for **fast loading on a phone over mobile data** and for **Android Chrome** first.
- If something is missing, choose the simplest option that matches the rest of this document, write the assumption in `ASSUMPTIONS.md`, and continue. Do not stop to ask unless the project cannot run without the answer.

---

## 1. Project overview

COSMIC HUNT is a web app that runs a campus treasure hunt. Teams of 4 players solve text riddles. Each riddle points to a physical place on campus where a secret code is hidden. The team finds the code, types it into the website, and if it is correct the next riddle unlocks. Each team has 30 minutes. One organizer (the admin) controls everything from a hidden control panel on a laptop.

**Goal.** Replace paper clues and manual scorekeeping with one fast website that hands out riddles, checks codes, runs a 30-minute timer (shown with milliseconds), and produces a results list that the admin reveals at the end.

**Who uses it**

| User | Device | What they do |
| --- | --- | --- |
| Admin (1 person) | One laptop | Sets up teams and clues, starts each team, monitors live, handles problems, reveals results, exports results |
| Teams (5 to 10 phones) | The players' own Android phones, Chrome browser, mobile data | Log in with a team code, read the current riddle, enter hidden codes |
| Audience (optional) | Phones or a projector | Open the public leaderboard page. It shows "results hidden" until the admin reveals it |

**Version 1 scope (in):** landing page with looping video background, team login, team game screen with a 30:00.000 timer, public leaderboard (hidden until revealed), hidden admin control panel (live monitoring, game control, clue and team management, assignment, logs, CSV export), server-side code checking, sample data.

**Out of scope (do not build):** payments, public registration, GPS or location checking, AI-generated clues, audio or video clues, hints, points or scores other than clues solved and time, team chat, notifications, multi-admin roles, sector or location names shown to players.

---

## 2. Event facts and official rules

### 2.1 Fixed facts

| Item | Value |
| --- | --- |
| Event name | COSMIC HUNT |
| Tagline | Decode the campus. Reach the stars. |
| College | Nirmala Memorial Foundation College of Commerce & Science |
| Date and time | 27 November 2026, 10:00 AM (India time, IST, UTC+5:30) |
| Team size | Exactly 4 players per team |
| Number of teams | Design for 1 to 10 teams. Seed 6 sample teams. (The organizer will confirm the final count; they have mentioned both 5 and 6.) |
| Clues per team | 6 (every team solves the same number) |
| Play time per team | 30 minutes, shown as `MM:SS.mmm` (with milliseconds) |
| Scheduling | **No fixed slots.** The admin starts each team manually, whenever ready. Nothing is automatic. |
| Devices | Players use **their own Android phones** with Chrome, on **their own mobile data**, only for this website |
| Admin device | One laptop |
| Contact person / phone | None to show (N/A). Disqualified and Time-up screens say "Please return to the organizers." |
| Department / committee line | None. Do not show any department name. |
| Language | English only |
| Results | Held by the admin. The public leaderboard stays hidden until the admin reveals it |
| Wrong attempts | **No time penalty.** Only a short anti-spam lockout (Section 5.4) |
| Hints | None in version 1. Keep the data field but switched off and hidden |
| Prizes and certificates | Handled by the organizer outside the site |

### 2.2 Official rules (show all 9 on the Landing page and on the Team Login page)

1. Each team has exactly 4 players.
2. The game is played inside the college premises only.
3. Teams must report 1 hour before their game starts.
4. Each team gets 30 minutes of play time.
5. Phones used for outside help, or any unfair means, lead to disqualification. (A phone may be used only to open this website.)
6. No cross-teaming and no outside help.
7. Cheating, disrespect or misbehaviour leads to disqualification.
8. Match timing is not changed once the team has started.
9. The organizers' decision is final.

### 2.3 How each rule maps to the software

| Rule | What the website does |
| --- | --- |
| 4 players | Team record stores exactly 4 member names; the admin form requires 4 |
| 30 minutes | Server-side timer, default 1,800,000 ms (editable in Settings); the game locks at zero |
| Timing not changed | Time is never extended automatically. Only the admin can add or remove time, and it is logged |
| Disqualification | Admin can mark a team Disqualified. The team is locked out on its next request (within about 4 seconds) |
| No cross-teaming or outside help | Different clue order per team, every attempt is logged for review |
| Organizers' decision is final | Admin overrides: manual unlock, add or remove time, pause, reset, disqualify, re-qualify |
| Rules visible | The 9 rules are shown on the Landing page and in the Team Login page |

**Phone note.** Teams use their own phones. The organizers cannot technically stop a team from using a phone for other purposes. The software logs every attempt, and the organizers watch teams on the ground. This is accepted.

---

## 3. User roles and access

| Role | How they enter | Can do | Must never see |
| --- | --- | --- | --- |
| Admin | Hidden control URL, then email and password (Firebase Authentication) | Everything | Nothing hidden |
| Team | Team access code on the Team Login page. The server creates a signed session token | See only its own current clue, enter codes, see its timer and progress | Other teams' clues, any secret code, future clues, other teams' data |
| Public | No login | Landing page; leaderboard page (locked until revealed) | Clues, codes, access codes, member names |

The admin pages must refuse anyone who is not the verified admin, even if they type the URL. The hidden URL is only an extra layer. Real protection is Firebase Authentication plus a server-side email allowlist (Section 9).

---

## 4. Event-day flow and organizer runbook

### 4.1 Before the event (setup, done by the admin on the laptop)

1. Log in to the control panel.
2. Check or edit the 6 team names and their 4 members each (Teams tab).
3. Create or import the clues and their secret codes (Clues tab).
4. Assign each team its ordered list of 6 clues (Assignment tab). Use Auto-shuffle, then review.
5. Print the access code slips (Teams tab, "Print all codes").
6. Physically place the hidden codes at the clue locations on campus. Each code is a short alphanumeric string like `YEL-7N4W` on paper, a sticker, or a card.
7. Run a full test with a dummy team and 1 phone, then press "Reset event".
8. Check the leaderboard is **hidden** (the reveal toggle is off).

### 4.2 During the event

1. Teams report 1 hour before their start and receive their access code slip.
2. The team opens the site on its own phone and logs in with the code. It sees the **Waiting** screen.
3. The admin presses **Start** on that team's row. The 30:00.000 countdown begins for that team only.
4. The team reads the first clue, finds the code, enters it. Correct: the next clue unlocks. Wrong: an error and the attempt is logged.
5. The admin watches the live table and can pause, add or remove time, unlock a clue manually, disqualify, or reset a team.
6. The admin can start the next team at any moment. Teams play independently.

### 4.3 After the event

1. Admin presses **Stop mission** (locks any team still running). 
2. Admin checks the Results table in the control panel.
3. Admin turns **Reveal leaderboard** on. The public leaderboard now shows the ranking (use the projector).
4. Admin exports Results, Attempts and Admin log as CSV.
5. Admin announces winners. The organizers' decision is final.
6. Admin resets or keeps the data.

### 4.4 Problem handling (runbook)

| Problem | What the admin does |
| --- | --- |
| Team lost or damaged its code slip | Teams tab: Regenerate code, hand over the new one |
| A hidden code sticker is missing or stolen | Live table: Manual unlock for that team (logged as "admin unlocked") |
| A code was printed wrongly | Clues tab: edit the secret code. It takes effect immediately |
| Team's phone dies or changes | Log in on another phone with the same code. The old phone is signed out |
| Team suspected of cheating | Review the Attempts log, then Pause or Disqualify |
| Team disputes its time | Open the Attempts log (every attempt has a timestamp) and the Admin log |
| Admin laptop internet drops | Teams are not affected (server-side timers). Reconnect and the panel resumes |
| Team's data dropped mid-game | The banner "Signal lost. Reconnecting..." shows; the timer keeps counting from server time; the typed code is kept |

---

## 5. Game logic (server rules)

All of this runs in Netlify Functions using the Firebase Admin SDK. Times are in milliseconds since the Unix epoch.

### 5.1 Team statuses
`waiting` (not started), `playing`, `paused`, `completed`, `timeup`, `disqualified`.

Event statuses: `setup`, `live`, `stopped`.

### 5.2 Timer
Each team has: `startedAtMs`, `pausedAtMs` (null when not paused), `pausedTotalMs`, `addedMs` (time the admin added), `penaltyMs` (time the admin removed as a penalty), and `durationMs` (copied from settings when the team starts, default 1,800,000).

```
elapsedMs  = (pausedAtMs ?? nowMs) - startedAtMs - pausedTotalMs
timeLeftMs = durationMs + addedMs - penaltyMs - elapsedMs
```

- The timer starts only when the admin presses Start for that team (not when the team logs in).
- When `timeLeftMs <= 0` the server sets the team to `timeup` (lazily, on the next request, and also from the admin panel sync call every 15 seconds). Further submissions are rejected.
- When a team solves its 6th clue, the status becomes `completed` and the timer stops. Save `finishedElapsedMs` (elapsed time at the last correct code).

### 5.3 Pause and resume

- Pause: set `pausedAtMs = now`. Code submission is blocked. The timer freezes.
- Resume: `pausedTotalMs += now - pausedAtMs; pausedAtMs = null`.
- "Pause all" and "Resume all" apply to every team that is `playing` (or `paused`).

### 5.4 Code verification and lockout

1. The team submits a code for its **current** clue. The request carries a `submissionId` (random UUID) so a retry never double counts.
2. The server **normalizes**: uppercase, then remove everything that is not a letter or digit (so `yel-7n4w`, `YEL 7N4W` and `YEL7N4W` are the same).
3. Compare with the normalized secret code of the team's **current** clue only. A code that is correct for another clue is treated as wrong, and the response never says "close".
4. Correct: increment `solvedCount`, move to the next clue, save `lastSolvedElapsedMs`, log the attempt. If it was the 6th clue, mark `completed`.
5. Wrong: log the attempt and return a generic error. **No time penalty.**
6. Anti-spam lockout (editable in Settings, defaults): if a team makes **5 wrong attempts within 60 seconds**, lock its input for **30 seconds** (`lockedUntilMs`). This is not a score penalty and does not change the timer.
7. The check runs inside a Firestore **transaction** so two simultaneous submissions can never skip a clue.

### 5.5 Admin overrides

- **Disqualify / Re-qualify:** sets status `disqualified` (with a reason) or returns the team to its previous state.
- **Manual unlock:** moves the team to the next clue as if solved. The attempt log shows `ADMIN UNLOCK`. Counts as completed for progress.
- **Add time / Remove time:** changes `addedMs`. **Time penalty:** changes `penaltyMs` and counts towards ranking time. Each needs a reason, and is logged.
- **Reset team:** back to `waiting`, progress, timer, attempts counters cleared (the log keeps the history).
- **Reset event:** clears all progress for all teams (typed confirmation `RESET`). Teams, clues and assignments stay.

### 5.5b Single-device rule
Only one active session per team. When a team logs in, the server creates a new `sessionId`. Any older device gets "This team is now active on another device" on its next request and is signed out. The new login shows a confirmation first: "This team is signed in on another device. Signing in here will sign out the other one."

### 5.6 Ranking (used by the leaderboard and Results table)

1. More clues solved ranks higher.
2. If equal: lower **rank time** ranks higher, where `rankTimeMs = lastSolvedElapsedMs + penaltyMs`. (Time bonuses added by the admin do not change ranking.)
3. If still equal: the team that reached its latest solved clue first (earlier real timestamp) ranks higher.
4. Disqualified teams are listed at the bottom with no rank.

### 5.7 Edge cases

| Situation | Required behavior |
| --- | --- |
| Two submissions at the same moment | One transaction wins; no clue is skipped |
| Refresh during pause | Paused overlay with the frozen time |
| Admin stops the mission | All `playing` and `paused` teams become `timeup` (end reason "stopped"), times saved |
| Team solves all 6 | `completed`, timer stops, shows total time |
| Disqualified mid-game | Locked on the next request (poll every 4 s) |
| Server error on submit | "Could not reach the server. Retrying..." The typed code stays, retry uses the same `submissionId` |
| Page refresh or reopen | Exact state restored (same clue, same time left) |
| Phone sleeps and wakes | Timer re-syncs with the server immediately on wake |
| Team logs in before it is started | Waiting screen; auto-updates when started |
| Code slip typed with spaces/lowercase | Normalized, accepted |

---

## 6. Technical architecture

### 6.1 Stack (fixed)

| Layer | Choice |
| --- | --- |
| Frontend | **Vite multi-page app, vanilla JavaScript (ES modules), Tailwind CSS compiled at build time (not the CDN)**. No React, no heavy framework. This keeps the phone download small and fast. |
| Hosting | **Netlify** (static site + Netlify Functions) |
| Database and admin login | **Firebase** (Firestore + Firebase Authentication). The `firebase-admin` SDK runs only inside Netlify Functions |
| Functions runtime | Node 20, ES modules (`.mjs`) |
| Fonts | Self-hosted woff2 files: Space Grotesk (600, 700), Inter (400, 500, 600), JetBrains Mono (500, 700). Latin subset. `font-display: swap`. Preload the two most used |
| Icons | Inline SVG (a small hand-picked set, for example from Lucide). **Do not load the Material Symbols web font** (too heavy for mobile data) |
| Realtime | Teams: polling `team-state` every 4 s. Leaderboard: polling every 5 s. Admin: Firestore `onSnapshot` listeners |

Why polling for teams: teams have no Firebase account and cannot read Firestore, so the server is their only door. Polling every 4 seconds keeps disqualify, pause and start reactions within about 4 seconds and costs very little.

### 6.2 Performance budget (mobile data)

- Team pages (`/login`, `/play`): total transfer under **120 KB** gzipped, excluding fonts. No video, no large images. CSS starfield only.
- Landing page: the hero video is the only large asset (Section 11). Everything else lazy-loads.
- No third-party analytics, no CDN scripts, no external requests other than Firebase (admin pages only).
- Team pages must not import the Firebase SDK at all.
- Admin pages may import the Firebase web SDK (modular, tree-shaken).

### 6.3 Folder structure

```
cosmic-hunt/
  AGENTS.md                      (this document)
  ASSUMPTIONS.md                 (the agent writes decisions it had to make)
  design-reference/              (Stitch exports + DESIGN.md + video original)
  package.json
  vite.config.js                 (multi-page inputs)
  tailwind.config.js             (tokens from DESIGN.md, Section 10)
  netlify.toml                   (build, redirects, headers)
  firestore.rules
  public/
    hero.mp4  hero.webm  hero-poster.webp
    logo.svg  favicon.svg  og-image.png  robots.txt
    fonts/*.woff2
  src/
    index.html                   (Page 1 Landing)
    login.html                   (Page 2 Team Login)
    play.html                    (Pages 3 and 4 Team Game and end states)
    leaderboard.html             (Page 5)
    ops-x7q/index.html           (Page 6 Admin login + live command center, HIDDEN PATH)
    ops-x7q/manage.html          (Page 7 Admin management)
    js/
      api.js                     (fetch wrapper, server time offset)
      timer.js                   (ms countdown)
      team-session.js
      play.js  login.js  leaderboard.js  landing.js
      admin/ (auth.js, live.js, manage.js, logs.js, csv.js)
    css/ (tailwind entry, glass.css, starfield.css)
  netlify/functions/
    team-login.mjs
    team-state.mjs
    submit-code.mjs
    leaderboard.mjs
    public-config.mjs
    admin-action.mjs             (one function, many `action` values)
    _lib/ (firebase.mjs, auth.mjs, time.mjs, rank.mjs, normalize.mjs)
```

The admin path `/ops-x7q/` is a constant in one place (`src/js/config.js`) so it can be renamed. It must not appear in any public link, sitemap, or in `robots.txt`.

### 6.4 URLs

| URL | Page |
| --- | --- |
| `/` | Landing |
| `/login` | Team Login |
| `/play` | Team Game (all team states) |
| `/leaderboard` | Public leaderboard |
| `/ops-x7q/` | Hidden admin login + live command center |
| `/ops-x7q/manage` | Hidden admin management |
| `/api/*` | Redirects to `/.netlify/functions/*` |

Add `X-Robots-Tag: noindex, nofollow` and `Cache-Control: no-store` headers for `/ops-x7q/*`, `/play`, and `/api/*` in `netlify.toml`.

### 6.5 Accounts and environment the owner must create

1. **Firebase project** (free Spark plan is enough): enable **Firestore** (production mode) and **Authentication, Email/Password** provider. Create a **service account key** (JSON).
2. **Netlify site** connected to the repo (or manual deploy).
3. **Netlify environment variables**
   - `FIREBASE_SERVICE_ACCOUNT_B64`: the service account JSON, base64 encoded
   - `SESSION_SECRET`: a long random string for signing team session tokens
   - `ADMIN_EMAILS`: the admin email (comma separated if more later)
   - `NODE_VERSION=20`
4. The Firebase **web config** (apiKey, authDomain, projectId, appId) is public by design and goes in `src/js/config.js`.

---

## 7. Data model (Firestore)

Clients (browsers) can **never write**. Team browsers can **never read** Firestore. Only the admin can read (rules in Section 9). All writes happen in Netlify Functions using the Admin SDK.

### 7.1 Collections
**`config/event`** (one document)

```
name: "COSMIC HUNT"
college: "Nirmala Memorial Foundation College of Commerce & Science"
tagline: "Decode the campus. Reach the stars."
eventDateText: "27 Nov 2026 | 10:00 AM"
eventDateIso: "2026-11-27T10:00:00+05:30"
status: "setup" | "live" | "stopped"
durationMs: 1800000
leaderboardRevealed: false
lockout: { maxWrong: 5, windowSec: 60, lockSec: 30 }   // maxWrong 0 = lockout off
cluesPerTeam: 6
createdAt, updatedAt
```

All text shown on the public pages (name, college, tagline, date line) comes from here, so it is editable from the control panel. Defaults are baked into the front end as fallback.

**`teams/{teamId}`** (readable by admin only)

```
name: "Nebula-9"
members: ["Player 1","Player 2","Player 3","Player 4"]   // exactly 4
status: "waiting" | "playing" | "paused" | "completed" | "timeup" | "disqualified"
endReason: null | "timeup" | "stopped" | "completed"
clueOrder: ["clueId1", ... 6 ids]
currentIndex: 0          // 0 to 5; 6 means all done
solvedCount: 0
wrongCount: 0
adminUnlockCount: 0
startedAtMs: null
pausedAtMs: null
pausedTotalMs: 0
durationMs: 1800000      // copied when started
addedMs: 0
penaltyMs: 0
lastSolvedElapsedMs: null
finishedElapsedMs: null
lastSolvedAtMs: null     // real timestamp (tie-break)
lastActivityMs: null
recentWrongMs: []        // up to 5 latest wrong timestamps for lockout
lockedUntilMs: 0
sessionId: null
lastSubmissionId: null
lastSubmissionResult: null
dqReason: null
statusBeforeDq: null
createdAt, updatedAt
```

**`teamSecrets/{teamId}`** (admin only): `{ accessCode: "K7M4PX" }`. Login looks up this collection.

**`clues/{clueId}`** (admin only)

```
title: "Clue 1: Notice board"      // admin only label
text: "the riddle text players read"
locationNote: "private note: where the code is placed"
active: true
hintText: null     // reserved, hidden, not used in v1
hintPenaltySec: 0  // reserved
createdAt, updatedAt
```

**`clueSecrets/{clueId}`** (admin only): `{ code: "YEL7N4W", display: "YEL-7N4W" }` (store normalized and display form).

**`attempts/{attemptId}`**

```
teamId, teamName, clueId, clueTitle,
entered: "YEL7N4W"        // normalized form of what the team typed
result: "correct" | "wrong" | "locked" | "admin_unlock"
tsMs, elapsedMs
```

**`adminLog/{logId}`**: `{ tsMs, action, teamId?, teamName?, detail, by }`

**`loginAttempts/{ipHash}`**: `{ windowStartMs, count, lockedUntilMs }` (to limit repeated wrong team-code logins: 10 wrong in 5 minutes locks that IP for 30 seconds)

### 7.2 Team session token
A signed JWT (HS256, `SESSION_SECRET`), 12-hour expiry, payload `{ teamId, sid }` where `sid` equals `teams/{teamId}.sessionId`. Stored in `localStorage` (key `ch_session`). Sent as `Authorization: Bearer <token>` on every team request. If `sid` does not match the team's current `sessionId`, return `{ state: "signed_out" }`.

---

## 8. API (Netlify Functions)

All responses are JSON and include `serverNowMs` so the browser can compute its clock offset. All errors are generic.

### 8.1 `POST /api/team-login`
Body `{ code, force }`. Normalizes the code, rate limits by IP, looks up `teamSecrets`. If the team already has an active `sessionId` and `force` is not true, return `{ ok:false, reason:"active_elsewhere" }` (the UI then asks for confirmation and retries with `force:true`). On success creates a new `sessionId`, returns `{ ok:true, token, teamName }`. Failures: `invalid` (generic), `rate_limited` (with `retryAfterSec`).

### 8.2 `GET /api/team-state`
Bearer token. Returns the full state the screen needs:

```
{
  serverNowMs,
  state: "waiting"|"playing"|"paused"|"completed"|"timeup"|"disqualified"|"signed_out"|"stopped",
  teamName,
  timer: { timeLeftMs, frozen: true|false },
  progress: { current: 3, total: 6 },           // 1-based current clue number
  clue: { number, text } | null,                 // only the current clue
  solved: [ { number, title } ],                 // titles of solved clues only
  lockedUntilMs,
  finished: { elapsedMs, solved } | null
}
```

It never returns future clue text, any secret code, or other teams' data. It performs the lazy time-up check.

### 8.3 `POST /api/submit-code`
Body `{ code, submissionId }`. Runs the transaction in Section 5.4. Returns `{ result: "correct"|"wrong"|"locked"|"closed", ...new state }`. `closed` means the game is paused, not started, time is up, or the team is disqualified. It never says "close".

### 8.4 `GET /api/leaderboard`
No auth. If the event is not revealed, return `{ revealed:false, status, teamsCount, cluesPerTeam }` only. If revealed, return ranked rows `{ rank, name, solved, timeMs, status }` (no member names, no codes) plus `status`.

### 8.5 `GET /api/public-config`
No auth. Returns event name, college, tagline, date text, ISO date, event status, cluesPerTeam, teamsCount. Cached 30 s.

### 8.6 `POST /api/admin-action`
Header `Authorization: Bearer <Firebase ID token>`. The function verifies the token with the Admin SDK and checks the token email is in `ADMIN_EMAILS`. Body `{ action, ...params }`. Actions:

| Group | Actions |
| --- | --- |
| Game | `startTeam`, `startAllWaiting`, `pauseTeam`, `resumeTeam`, `pauseAll`, `resumeAll`, `stopMission`, `syncTimeouts` |
| Overrides | `addTime`, `removeTime`, `addPenalty`, `manualUnlock`, `disqualify`, `requalify`, `resetTeam`, `resetEvent`, `signOutTeam` |
| Teams | `createTeam`, `updateTeam`, `deleteTeam`, `regenerateCode` |
| Clues | `createClue`, `updateClue`, `deleteClue`, `duplicateClue`, `importClues` |
| Assignment | `setClueOrder`, `autoShuffle` |
| Settings | `updateEvent`, `setReveal` |
| Data | `loadSampleData`, `importTeamRiddles` (CSV rows, Section 13.4) |

Every action writes an `adminLog` entry (who, what, when). `resetEvent` and `loadSampleData` require `confirm: "RESET"` in the body.

---

## 9. Security

### 9.1 Firestore rules (`firestore.rules`)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null
        && request.auth.token.email in ['dnm124421@gmail.com'];
    }
    match /{document=**} {
      allow read: if isAdmin();
      allow write: if false;     // only Netlify Functions (Admin SDK) write
    }
  }
}
```

Team browsers never touch Firestore. The Admin SDK in functions bypasses these rules.

### 9.2 Admin account (do by hand, never in code)

- In the Firebase console go to Authentication, Users, **Add user**, with the admin email `dnm124421@gmail.com` and a password that the owner types there.
- **The password is never written in code, in the repo, in `.env` files, in this document, or in chat.** The owner types it into the login form.
- Because that email already exists in Authentication, nobody else can register it. Even if someone created some other account, the allowlist (`ADMIN_EMAILS` in functions and `isAdmin()` in the rules) would reject it.
- Recommended: the owner changes the password once before the event.

### 9.3 Other rules

- Hash nothing in the browser. Never send secret codes, access codes, or future clues to any team or public response.
- Netlify Functions must validate the Firebase ID token on every `admin-action` call. Reject anything else with a generic 401.
- Team tokens are signed (HS256), 12-hour expiry, and tied to `sessionId`.
- Team-code login is rate limited (10 wrong per 5 minutes per IP, then 30 seconds).
- Return the same generic error for "no such code" and "wrong code".
- Add security headers in `netlify.toml`: `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`.
- Secrets (service account, session secret) live only in Netlify environment variables.

---

## 10. Design system

The visual reference is the Stitch export in `design-reference/`, with tokens in `design-reference/DESIGN.md`. Build the following in `tailwind.config.js` and a small `components.css`.

### 10.1 Mood
Deep-space mission control that also feels like a treasure hunt. Calm, cinematic, precise, readable in sunlight. Dark mode only. Treasure hunt flavor comes from the copy (riddles, "decode", "waypoint", "vault"), small compass and key icons, and the "unlock" animations. **Do not make it playful or cartoonish.**

### 10.2 Colors

| Token | Value | Use |
| --- | --- | --- |
| `bg` | `#03060F` | Page background |
| `bg-glow` | `radial-gradient(ellipse at 50% 0%, rgba(13,27,56,.4) 0%, #03060F 75%)` | Soft top glow |
| `panel` | `rgba(10,18,34,.85)` | Cards (non-glass pages) |
| `panel-solid` | `#0A1222` | Modals, dropdowns |
| `border` | `#1B2A44` | 1px borders |
| `primary` | `#4DA3E8` | Buttons, links, focus, active |
| `primary-light` | `#7CC4FF` | Icons, eyebrow text, glow lines |
| `text` | `#DFE2F1` | Main text (white `#FFFFFF` for headings) |
| `text-muted` | `#A8B3C7` | Secondary text |
| `success` | `#34D399` | Completed, correct |
| `warn` | `#F59E0B` | Time up, last 5 minutes |
| `danger` | `#EF4444` | Disqualified, last minute, errors |
| `paused` | `#94A3B8` | Paused |
| `gold / silver / bronze` | `#F5C451 / #C9D1DC / #CD8A55` | Leaderboard top 3 only |

Status colors always come with an icon and a text label (never color alone).

### 10.3 Typography

| Role | Font | Notes |
| --- | --- | --- |
| Headings, buttons, labels | Space Grotesk 600/700 | Uppercase, letter spacing 0.06em to 0.2em |
| Body | Inter 400/500/600 | Minimum 16px |
| Timer, codes, numbers, table data | JetBrains Mono 500/700 | Tabular numerals |

Type scale (mobile / desktop): display 32px / 48px; headline-lg 28px; headline-md 22px; headline-sm 18px; body 16px; small 14px; eyebrow label 11px, weight 700, letter spacing 0.2em, color `primary-light`, always with a short dash prefix (`— HOW IT WORKS`).

### 10.4 Shapes, spacing, elevation

- Corner radius 2px (default) to 4px (modals). No pill shapes except status pills (2px).
- Base-8 spacing. Container max width 1280px on desktop, 16px side margins on mobile.
- Buttons are at least **48px high**; tap targets at least 44px.
- Offset outline frame (focal panels): `box-shadow: 0 0 0 1px #1B2A44, 4px 4px 0 0 rgba(124,196,255,.15)`.
- Glow (use sparingly): `box-shadow: 0 0 20px -4px rgba(77,163,232,.35)`.
- Wave-line divider: a 1px `#1B2A44` line with a small centered blue wave or chevron notch in `#7CC4FF` (inline SVG, a few hundred bytes).

### 10.5 Components
**Primary button.** Background `#4DA3E8`, text `#03060F`, Space Grotesk 700 uppercase, letter spacing 0.1em, radius 2px, min height 48px. Hover: glow `0 0 16px rgba(124,196,255,.4)`. Pressed: slightly darker. Disabled: 40% opacity, no glow.

**Secondary button.** Transparent, 1px `#4DA3E8` border, text `#7CC4FF`; hover background `rgba(77,163,232,.1)`.

**Danger button** (Stop, Disqualify, Reset): same shape, border and text `#EF4444`; confirm dialogs are required.

**Card / HUD panel.** Panel background, 1px `border`, radius 2px, 20 to 24px padding. A tiny mono caption (10px, `#A8B3C7`) can sit on the top border.

**Status pill.** Rectangular, 2px radius, a 6px dot plus mono 12px bold text: PLAYING (blue), COMPLETED (green), TIME UP (amber), PAUSED (grey-blue), DISQUALIFIED (red), WAITING (muted white). Add an icon for each (play, check, clock, pause, ban, hourglass).

**Inputs.** Dark fill `rgba(3,6,15,.85)`, 1px `border`, min height 52px, text 16px or larger (prevents mobile zoom), JetBrains Mono for codes. Focus: border `#4DA3E8` and `inset 0 0 8px rgba(77,163,232,.2)`. Always a visible label.

**Toast.** Top of screen on mobile, bottom-right on desktop. Success green, error red, 4 seconds.

**Modal.** `panel-solid`, 1px border, centered, dark backdrop 70%, focus trapped, Escape closes (except destructive confirmation which needs a button).

**Timer.** `MM:SS.mmm`, JetBrains Mono 700, large (mobile 44px, desktop 56px), tabular. Colors: normal `#7CC4FF`, under 5 minutes amber, under 1 minute red with a gentle 1-second pulse. Small sub-labels MIN / SEC / MS (10px).

**Progress bar.** 6 equal segments. Solved = solid `#4DA3E8`; current = outlined and softly pulsing; locked = dim.

### 10.6 Motion

- Starfield: CSS-only (two or three layers of `radial-gradient` dots, slow transform drift, 60s loop). No canvas, no JS.
- Correct code: input border turns green, a 400 ms blue-white bloom on the clue card, the new clue fades and slides in (300 ms). Optional short vibration `navigator.vibrate(40)`.
- Wrong code: 350 ms horizontal shake, red message, `navigator.vibrate([60,40,60])`.
- Buttons: 150 ms transitions. Respect `prefers-reduced-motion` (turn off drift, shake, pulse).
- Sound: a mute toggle exists; **default is off**.

### 10.7 Accessibility
Text contrast AA or better, status never by color alone, visible focus rings, labels on all inputs, `aria-live="polite"` on feedback messages, tap targets 44px or more, the timer is not announced every millisecond (announce only at 10, 5, 1 minute and 10 seconds).

---

## 11. Hero video and glass effect (Landing page)

### 11.1 The supplied video
The owner's video: portrait, **478 x 850 px, 11.8 seconds, 30 fps, about 2.6 MB, includes an audio track.** Content: a hyperspace tunnel with blue streaks, then a galaxy with a red nebula, then a bright blue vortex or black hole, then a planet horizon with a bright sunrise flash at the end. It is not a seamless loop as it stands (it starts in hyperspace and ends on a sunrise), so it must be processed.

### 11.2 Prepare it (the agent runs this, or the owner does)
Place the original at `design-reference/video/hero-original.mp4`. Then (ffmpeg):

```bash
# 1) Seamless loop: remove audio, fade the last 1 s into the first 1 s
ffmpeg -y -i design-reference/video/hero-original.mp4 -an -filter_complex \
"[0:v]trim=start=1:end=11.8,setpts=PTS-STARTPTS[p];\
 [0:v]trim=start=0:end=1,setpts=PTS-STARTPTS[q];\
 [p][q]xfade=transition=fade:duration=1:offset=9.8,format=yuv420p[v]" \
-map "[v]" -r 30 public/hero-loop-src.mp4

# 2) Web files
ffmpeg -y -i public/hero-loop-src.mp4 -an -c:v libx264 -crf 29 -preset slow -movflags +faststart public/hero.mp4
ffmpeg -y -i public/hero-loop-src.mp4 -an -c:v libvpx-vp9 -crf 38 -b:v 0 public/hero.webm

# 3) Poster (first frame) as WebP
ffmpeg -y -i public/hero-loop-src.mp4 -frames:v 1 -vf "scale=720:-2" public/hero-poster.png
cwebp -q 70 public/hero-poster.png -o public/hero-poster.webp   # or any PNG to WebP tool
```

The video is portrait and low resolution. On phones (the main device) it fills the screen with `object-fit: cover`. On a wide laptop it is scaled up, so it will look softer; the dark overlay and glass blur hide this well. If the owner later supplies a landscape 1080p version, swap the files and change nothing else. Target size: under 2 MB for `hero.mp4`.

### 11.3 How to place it

```html
<video class="hero-video" autoplay muted loop playsinline preload="metadata"
       poster="/hero-poster.webp" aria-hidden="true">
  <source src="/hero.webm" type="video/webm">
  <source src="/hero.mp4" type="video/mp4">
</video>
<div class="hero-scrim"></div>
```

```css
.hero-video{position:fixed;inset:0;width:100%;height:100%;object-fit:cover;z-index:-2}
.hero-scrim{position:fixed;inset:0;z-index:-1;
  background:linear-gradient(to bottom,rgba(3,6,15,.45),rgba(3,6,15,.62) 55%,rgba(3,6,15,.82))}
@media (prefers-reduced-motion:reduce){.hero-video{display:none}
  body{background:#03060F url(/hero-poster.webp) center/cover fixed}}
```

- The video is **fixed behind the whole Landing page** (every section scrolls over it).
- Muted, no audio track, `playsinline` so it never opens fullscreen.
- If `navigator.connection.saveData` is true, do not load the video; show the poster.
- Use the video **only on the Landing page**. All other pages use the CSS starfield.

### 11.4 Glass effect (the key look of the Landing page)
Every component on the Landing page (nav bar, hero panel, stat cards, step cards, rules panel, footer) is a **glass card** that shows the looping video through it. The **border highlights and catches the light** as the video changes behind it.

```css
.glass{
  position:relative; border-radius:4px;
  background:linear-gradient(135deg,rgba(255,255,255,.09),rgba(255,255,255,.03));
  backdrop-filter:blur(14px) saturate(140%);
  -webkit-backdrop-filter:blur(14px) saturate(140%);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.28),
             inset 0 0 24px rgba(124,196,255,.06),
             0 8px 32px rgba(0,0,0,.35);
  isolation:isolate;
}
/* bright gradient border that "catches" the light */
.glass::before{
  content:""; position:absolute; inset:0; border-radius:inherit; padding:1px;
  background:linear-gradient(135deg,rgba(255,255,255,.65),rgba(124,196,255,.18) 35%,
             rgba(255,255,255,.05) 60%,rgba(124,196,255,.5));
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
  -webkit-mask-composite:xor; mask-composite:exclude;
  pointer-events:none;
}
/* slow light sweep along the border */
.glass::after{
  content:""; position:absolute; inset:0; border-radius:inherit; padding:1px;
  background:linear-gradient(110deg,transparent 35%,rgba(160,215,255,.95) 50%,transparent 65%);
  background-size:300% 100%; animation:glass-sweep 7s linear infinite;
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
  -webkit-mask-composite:xor; mask-composite:exclude; pointer-events:none; opacity:.8;
}
@keyframes glass-sweep{0%{background-position:150% 0}100%{background-position:-150% 0}}
@supports not (backdrop-filter:blur(1px)){.glass{background:rgba(10,18,34,.88)}}
@media (prefers-reduced-motion:reduce){.glass::after{animation:none;opacity:0}}
```

Rules for glass:

- Use it for at most about 10 elements visible at once (blur is costly on mid-range Android phones). Do not nest glass inside glass.
- Text on glass must stay readable on the brightest video frame (the sunrise flash): the scrim above and the 0.09 white tint handle this. Check contrast on that frame.
- Hover or focus on a glass card raises the border brightness (`.glass:hover::before` increases opacity of the white stops) and adds a small blue glow.
- The glass look may also be reused (flat, **without** `backdrop-filter`) on the other pages for brand consistency. On `/play` do not use blur at all (battery and speed).

---

## 12. Pages 1 to 4 (Landing, Team Login, Team Game, Team end states)

General rules for all pages: mobile first (360 x 800), sticky compact header on `/play`, no horizontal scroll, `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`, safe-area padding with `env(safe-area-inset-*)`, theme color `#03060F`, title `COSMIC HUNT | Nirmala Memorial Foundation College`.

### PAGE 1: LANDING (`/`)
**Purpose:** first impression, event info, the rules, and entry to Team Login and the Leaderboard. Public.

**Look:** the looping hero video fixed behind everything (Section 11). All sections are glass cards. Layout reference: `design-reference/landing/screen.png`, but with the changes below.

**Changes from the Stitch reference**

- Remove the fake telemetry card, the "Operational Gateways" 4-portal section, the "Campus Sector Matrix", and the department line.
- Remove any link to the admin panel. No "Command Center" text anywhere.
- Show **all 9 rules**, not 6.
- Replace "Zero Collision" with "Different route for every team".
- Footer shows the full college name.

**Sections (top to bottom)**

1. **Glass nav bar** (sticky): logo + `COSMIC HUNT` at left; links `About`, `Rules`, `Leaderboard`; an outlined `TEAM LOGIN` button at right. On mobile: logo and a menu button that opens a glass dropdown with the same links.
2. **Hero** (glass panel, left aligned, full-height on mobile with the video visible around it):
   - Eyebrow: `— TREASURE HUNT // 27 NOV 2026`
   - H1: `COSMIC HUNT`
   - Tagline: `Decode the campus. Reach the stars.`
   - Text: `Nirmala Memorial Foundation College of Commerce & Science | 27 Nov 2026 | 10:00 AM`
   - One paragraph: `Teams of 4 solve riddles, find hidden codes across the campus, and unlock the next clue. 6 clues. 30 minutes. Fastest team wins.`
   - Buttons: primary `START MISSION` (goes to `/login`), secondary `VIEW LEADERBOARD` (goes to `/leaderboard`).
   - Beside or below it (desktop right side, mobile below): a small **glass "Mission clock" card** with a live countdown to the event start (from `eventDateIso`): `DD : HH : MM : SS`. When the event time has passed it shows `MISSION LIVE` or `EVENT ENDED` depending on `status`. Under the clock a status pill: `NOT STARTED` / `LIVE` / `ENDED`.
3. **Stat cards** (4 glass cards in a row; 2x2 on mobile): `4` PLAYERS PER TEAM; `30` MINUTES OF PLAY; `6` CLUES TO CRACK; `1` DIFFERENT ROUTE FOR EVERY TEAM. Each has a thin-line icon on top, a big value, a small caption.
4. **How it works** (eyebrow `— HOW IT WORKS`, title `FOUR STEPS TO THE TREASURE`): 4 glass step cards with numbers 01 to 04: `RECEIVE THE RIDDLE` (Read the clue on your phone), `SEARCH THE CAMPUS` (Find the hidden code), `ENTER THE CODE` (Type it in and press Submit), `UNLOCK THE NEXT CLUE` (Solve all 6 before time runs out).
5. **Wave-line divider.**
6. **Rules** (eyebrow `— THE RULES`, title `MISSION DIRECTIVES`): one large glass panel with all 9 rules as a numbered list in two columns on desktop and one on mobile. Under it: `The organizers' decision is final.`
7. **Final call to action**: a glass strip with `READY TO LAUNCH?` and the `START MISSION` button.
8. **Glass footer:** logo, `COSMIC HUNT`, the full college name, `Decode the campus. Reach the stars.`

**Behavior:** text content reads from `/api/public-config` (cached) with baked-in fallback text. The countdown runs on the client from `eventDateIso`. Status pill refreshes every 30 seconds. If config fails, show the fallback silently. Page weight excluding video under 80 KB.

### PAGE 2: TEAM LOGIN (`/login`)
**Purpose:** the team enters its access code. Public page. Reference: `design-reference/team-login/screen.png`.

**Look:** starfield background (no video, no blur), one centered panel (max width 420px) with the offset outline frame.

**Content (top to bottom)**

1. Small header: logo + `COSMIC HUNT`.
2. Eyebrow `— MISSION LOGIN`, H1 `ENTER YOUR TEAM CODE`.
3. A helper box with a key icon: `Type the 6-character code from your team slip.`
4. **Code entry:** one text input (6 characters; uppercase; no spaces; `autocapitalize="characters"`, `autocomplete="off"`, `spellcheck="false"`, `inputmode="text"`) shown as 6 character boxes that fill as the team types (the real input sits invisibly on top, so paste and keyboards work). Counter `0 / 6`.
5. Primary button `LAUNCH MISSION` (full width, rocket icon). Disabled until 6 characters.
6. A collapsible panel `OFFICIAL RULES` containing all 9 rules (closed by default on mobile).
7. Footer line: the college name.

**Remove from the reference:** the `PRESETS` test chips, latency and encryption readouts, GPS coordinates, "Radial Beacon", port and node labels, and the state-switcher bar (these are designer tools).

**States and exact messages**

| State | What the team sees |
| --- | --- |
| Empty | Boxes empty, button disabled |
| Typing | Boxes fill, button enabled at 6 characters |
| Loading | Button shows a spinner and `CHECKING...`, input disabled |
| Wrong code | Red message under the boxes: `Invalid team code. Check your slip.` Boxes shake once |
| Rate limited | `Too many attempts. Try again in 30 seconds.` with a live countdown; button disabled until it ends |
| Active on another device | Modal: `This team is signed in on another device. Signing in here will sign out the other one.` Buttons `SIGN IN HERE` and `CANCEL` |
| Success | Save the token, go to `/play` |
| Network error | `Signal lost. Check your connection and try again.` |

Already logged in (valid token in storage): skip this page and go to `/play`.

### PAGE 3: TEAM GAME (`/play`), the most important screen
**Purpose:** play the game. Mobile first, used outdoors. Reference: the phone frame in `design-reference/team-game/screen.png` (**build only the phone UI**, not the surrounding simulator panels).

**Layout (360 px wide)**

```
+---------------------------------+
| NEBULA-9           [signal] [snd]|  top bar (sticky)
|                                 |
|        29:41.236                |  big timer (MM:SS.mmm)
|        MIN   SEC   MS           |
| CLUE 3 OF 6                     |
| [##][##][ #][  ][  ][  ]        |  6-segment progress
|---------------------------------|
| — CLUE 03                       |
| +-----------------------------+ |
| | "riddle text, large and     | |  clue card
| |  readable, 18-20px"         | |
| +-----------------------------+ |
| DECRYPT://  [ YEL-7N4W        ] |  code input
| [        SUBMIT CODE          ] |  primary button
|---------------------------------|
| v SOLVED CLUES (2)              |  collapsed list of titles
+---------------------------------+
```

**Components and behavior**

1. **Top bar (sticky):** team name at left (always visible); small signal indicator (green dot online, amber "Reconnecting"); a sound on/off icon (off by default). No battery, no GPS, no "4G" readouts.
2. **Timer:** `MM:SS.mmm`, updated with `requestAnimationFrame`. Implementation: on every `team-state` response compute `offset = serverNowMs - (clientNow at response midpoint)` and `timeLeftAtSync`; between syncs show `timeLeftAtSync - (performance.now() - syncPerf)`. Re-sync every 4 seconds (with the state poll), on every action, and instantly on `visibilitychange`. When paused, show the frozen value and no tick. When it reaches `00:00.000`, call `team-state` once to confirm time up and switch screens. Colors: normal blue, under 5:00 amber, under 1:00 red and pulsing.
3. **Progress:** text `CLUE 3 OF 6` and a 6-segment bar (Section 10.5). 
4. **Clue card:** eyebrow `— CLUE 03`, then the riddle text in 18 to 20 px Inter with comfortable line height. **Text only.** Do not show any location, sector, node or coordinate label (it would give hints). Do not show a hint button.
5. **Code input:** label `DECRYPT://` prefix, JetBrains Mono, 16px+, `autocapitalize="characters"`, auto-inserts the hyphen after the third character as the team types (`YEL-7N4W`), trims spaces, ignores case. Accepts a pasted code with or without the hyphen. Placeholder `ENTER CODE`. The keyboard "Enter" key submits.
6. **Submit button:** `SUBMIT CODE` (full width, 56px). While sending: spinner and disabled.
7. **Solved clues:** a collapsed section `SOLVED CLUES (2)`; expanded shows the clue titles solved so far (not the codes).
8. **Keep the screen awake:** request `navigator.wakeLock.request('screen')` when playing; re-request on `visibilitychange`. Ignore errors.
9. **Session:** store the token in `localStorage`. On any `signed_out` response, clear it and show the Signed-out screen.
10. **Draft protection:** keep the typed code in `sessionStorage` so a refresh or network drop does not lose it.

**Feedback states**

| Result | UI |
| --- | --- |
| Correct | Input border turns green, a 400 ms blue-white bloom, short vibration, the new clue fades in, the code box clears, progress updates. If it was the last clue, switch to the Mission Complete screen |
| Wrong | Card shakes, red message `Incorrect code. Try again.` (never "close" or "almost"), vibration, input selects its text. Attempt is logged. **No penalty message** |
| Locked (anti-spam) | Input and button disabled, message `Too many wrong attempts. Try again in 30 s.` with a live countdown |
| Sending | Spinner on the button |
| Offline | Banner `Signal lost. Reconnecting...`. The typed code stays. Retries use the same `submissionId`. When back online the banner disappears |
| Server says closed | Switch to the correct locked screen (paused, time up, not started, disqualified) |

Design all of: first clue, a middle clue, the last clue (6 of 6), and each feedback state.

### PAGE 4: TEAM END AND LOCKED STATES (inside `/play`)
Full-screen states with the starfield, a wave-line divider, and the team name at the top. The timer logic never runs on these except Paused.

| State | Title | Content |
| --- | --- | --- |
| Waiting | `MISSION NOT STARTED` | `Stay at the reporting desk. Your clock begins when the organizers start your team.` A subtle pulsing ring. Polls every 4 s and switches automatically when started |
| Paused | `GAME PAUSED` | Dark overlay over the game, frozen `MM:SS.mmm`, input disabled, text `Please wait for the organizers.` Resumes automatically |
| Time up | `TIME'S UP` | `Clues solved: 4 of 6` and `Please return to the organizers.` Amber accent |
| Mission complete | `MISSION COMPLETE` | Success animation, `Total time: 18:42.317`, `Clues solved: 6 of 6`, `Results will be announced by the organizers.` **No rank shown.** Green accent |
| Disqualified | `DISQUALIFIED` | Red locked screen: `Please return to the organizers.` No clue, no timer |
| Signed out | `SIGNED OUT` | `This team is now active on another device.` Button `LOG IN AGAIN` |
| Stopped | `MISSION ENDED` | `The organizers have ended the mission. Please return to the organizers.` (shows clues solved) |

---

## 12b. Pages 5 to 7

### PAGE 5: PUBLIC LEADERBOARD (`/leaderboard`)
**Purpose:** show the final ranking on a phone or the projector. Public and read-only. Reference: `design-reference/leaderboard/screen.png`. **Build only the real page, not the designer switches** (State A/B toggle and Projector/Mobile toggle are design tools; the real page is responsive and switches state from the server).

**Data:** `GET /api/leaderboard` every 5 seconds (pause polling when the tab is hidden).

**State A: results hidden (default until the admin reveals)**

- Full-width glass-style panel with the starfield, event header (`COSMIC HUNT // Nirmala Memorial Foundation College of Commerce & Science`).
- A lock icon and the title `RESULTS ARE ENCRYPTED`, subtitle `The leaderboard unlocks when the organizers reveal the results.`
- Decorative blurred placeholder rows behind (pure CSS shapes with no real data; the real names must never be sent while hidden).
- Two small cards: `6 TEAMS` and `6 CLUES EACH` (from the public config), and a status pill (`NOT STARTED`, `LIVE`, `ENDED`).
- **Remove** the unlock countdown and the "broadcast sync 99.98%" card from the reference.

**State B: results revealed**

- Eyebrow `— FINAL RANKING`, title `MISSION RESULTS`.
- Ranked table, columns: `RANK`, `TEAM`, `CLUES` (for example `6 / 6`), `TIME` (`MM:SS.mmm`), `STATUS` (pill).
- Top 3 rows highlighted in gold, silver, bronze (border and rank badge), with a small trophy or medal icon. Ranking rule: Section 5.6.
- Disqualified teams at the bottom, marked `DISQUALIFIED`, no rank number.
- Smooth reorder animation (FLIP technique, 400 ms) when the order changes.
- Shows team name only. Never member names, clue text, or codes.
- Mobile: each team is a compact row card. Projector: a `FULLSCREEN` button (Fullscreen API) enlarges type (rank and names about 2x), hides the header controls, and uses maximum contrast. Test at 1920x1080.

### PAGE 6: ADMIN LOGIN + LIVE COMMAND CENTER (`/ops-x7q/`)
**Purpose:** the single admin runs the event from a laptop (usable on a tablet). Reference: `design-reference/admin-live/screen.png`. This page is hidden: no link anywhere, `noindex`.

**6A. Admin login (shown when not signed in)**

- Centered panel: logo, `COMMAND CENTER`, `Admin access only`.
- Fields: `Email`, `Password` (with a show/hide toggle), button `SIGN IN`.
- Firebase `signInWithEmailAndPassword`. Errors: `Incorrect email or password.` (generic) and `Too many attempts. Try again later.`
- After sign in, the page checks that the email is the allowed admin by calling a harmless `admin-action` (`whoami`); if rejected, sign out and show `Access denied.`
- Auto sign-out after 60 minutes without activity. A `LOGOUT` button in the top bar.
- Do not store or prefill the password. Do not show any hint about valid emails.

**6B. Live command center (after sign in)**
Layout (laptop): a dark left sidebar and a main area.

- **Sidebar:** `LIVE COMMAND` (this page), `MANAGE` (Page 7), `LEADERBOARD` (opens the public page in a new tab), `LOGOUT`. No "Team Game" link.
- **Top strip:** event name, a game status badge (`SETUP` / `LIVE` / `STOPPED`), a server clock, and the global controls: `PAUSE ALL`, `RESUME ALL`, `STOP MISSION` (red, confirm dialog), and a **`REVEAL LEADERBOARD`** toggle (confirm dialog both ways; label shows `HIDDEN` or `REVEALED`).
- **Stat cards (4):** `TEAMS` (total), `PLAYING` (playing and paused), `COMPLETED`, `DISQUALIFIED`. Optional small stats row: fastest finish, average finish time, total wrong attempts.
- **Live team table** (updates in real time through Firestore listeners, no refresh). One row per team:

| Column | Content |
| --- | --- |
| Team | Name and the status pill |
| Progress | Segment bar and `3 of 6` |
| Solved | `3 / 6` |
| Time left | `MM:SS` ticking each second, computed from the team record and the server offset. Shows `--:--` while waiting. Frozen when paused. Red under 1 minute |
| Wrong | Count of wrong attempts |
| Last activity | Relative time (`12s ago`) |
| Actions | Buttons (see below) |

**Row actions:** `START` (only when waiting), `PAUSE` / `RESUME`, `+/- TIME` (small dialog: minutes and reason), `PENALTY` (seconds and reason), `UNLOCK NEXT` (manual unlock, confirm), `DISQUALIFY` / `RE-QUALIFY` (reason required), `RESET` (confirm), and a `...` menu with `COPY ACCESS CODE`, `SIGN OUT DEVICE`. Buttons are disabled when they do not apply (for example, `START` is disabled for a playing team). On a tablet the actions collapse into the `...` menu.
Header buttons above the table: `START ALL WAITING` (confirm).

- **Lower panels (3, as in the reference):**
  1. **Clue vault:** the 6 (or more) clues with title, the first words of the riddle, the secret code (visible only here), and the location note. Read-only (editing is on the Manage page). Include a `SHOW CODES` toggle so codes are hidden by default on the screen in case someone looks at the laptop.
  2. **Route matrix:** one row per team showing its clue order as chips (C1 to C6), the current clue highlighted, solved clues dimmed. A warning chip if two teams share the same first clue.
  3. **Live attempt feed:** newest first, the last 40 attempts: time, team, `entered code`, and a result tag (`PASS`, `FAIL`, `ADMIN UNLOCK`, `LOCKED`). An `EXPORT CSV` button.
- Every 15 seconds the page calls `admin-action: syncTimeouts` so teams whose time ran out are marked `timeup`.
- All actions show a toast, and all dangerous actions use a confirm modal.

**Remove from the reference:** "handset vitality" (battery, signal strength), geo-fence, PIN labels under team names, "Orbit/route algorithm" jargon, auto-refresh `0.5s` label, encryption seed text.

### PAGE 7: ADMIN MANAGEMENT (`/ops-x7q/manage`)
**Purpose:** prepare and adjust the event. Same sidebar and top bar as Page 6. Protected the same way. Tabs across the top:

**Tab 1: Teams**

- Table: name, 4 members, status, access code (hidden by default; `SHOW`), actions.
- `ADD TEAM` and edit form: team name (preset, **editable at any time**), exactly 4 member names (required), optional department and year (small optional fields; not shown publicly).
- The access code is generated by the server: 6 characters from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no `O 0 I 1 L`). It must be unique. The admin can edit it (6 chars, unique) or `REGENERATE`.
- `PRINT ALL CODES`: opens a print-friendly view with one slip per team (large team name, the code in big monospace, the website address, the 9 rules in small type). `COPY ALL CODES`.
- Delete team (confirm; blocked while the event is live unless the team is waiting).

**Tab 2: Clues**

- Table with search: title, riddle text (truncated), code, location note, active toggle.
- Add and edit form: `Title`, `Riddle text` (multi-line), `Secret code` (alphanumeric, example `YEL-7N4W`, auto-uppercase; has a `GENERATE` button that creates `XXX-XXXX` using planet-style prefixes or random letters), `Location note` (private), `Active`. No image field. Hint fields are hidden and unused.
- Validation: codes must be unique across active clues, 6 to 10 letters or digits after removing hyphens.
- Actions: duplicate, delete (confirm; blocked if assigned to a team that has started), search.
- Import: `IMPORT CSV / JSON` (paste or upload) for clues (Section 13.3) and `IMPORT TEAM RIDDLES` (Section 13.4).

**Tab 3: Assignment**

- One card per team showing its ordered list of 6 clues (title + first words).
- Reorder with up and down buttons (drag and drop is optional, nice to have).
- Each slot has a dropdown to pick a clue from the pool.
- `AUTO-SHUFFLE ALL`: uses the rotation algorithm in Section 13.5 (confirm).
- `PREVIEW PATH` shows the team's full path with titles.
- Warning chip if two teams share the same first clue, or if a clue is repeated within one team's list.
- Locked (read-only) for a team once it has started, unless the admin presses `UNLOCK EDITING`.

**Tab 4: Settings**

- Event texts: name, college, tagline, date line, ISO date/time (drive the public pages).
- Game: duration (minutes and seconds, default `30:00`), clues per team (default 6).
- Anti-spam lockout: max wrong attempts (default 5), window (default 60 s), lock time (default 30 s); `0` turns it off.
- Leaderboard: the reveal toggle (same as Page 6).
- All saved with a `SAVE` button and an `adminLog` entry.

**Tab 5: Logs and Export**

- Attempt log: time, team, clue, code entered, result. Filters by team and result.
- Admin log: time, action, team, detail.
- Buttons: `EXPORT RESULTS (CSV)`, `EXPORT ATTEMPTS (CSV)`, `EXPORT ADMIN LOG (CSV)`. Done in the browser from Firestore data.
- Results CSV columns: `rank, team, members, clues_solved, rank_time (MM:SS.mmm), status, wrong_attempts, admin_unlocks, penalty_seconds`.

**Tab 6: Danger zone**

- `LOAD SAMPLE DATA` (typed confirmation `RESET`) wipes teams, clues, attempts and loads Section 13.
- `RESET EVENT` (typed confirmation `RESET`): clears all progress; keeps teams, clues, assignments.
- `STOP MISSION` shortcut.

---

## 13. Sample data and the riddle questionnaire

**Everything in this section is SAMPLE ONLY.** The organizer will send the real riddles and codes later. The agent must seed this so the site can be tested end to end, and the admin can later replace it from the control panel or by importing the real riddles.

### 13.1 Sample teams (preset names, editable)

| Team | Members (sample) | Access code (sample) |
| --- | --- | --- |
| Nebula-9 | Player 1, Player 2, Player 3, Player 4 | `K7M4PX` |
| Orion-3 | Player 1, Player 2, Player 3, Player 4 | `R3T9WC` |
| Pulsar-7 | Player 1, Player 2, Player 3, Player 4 | `H8N2VD` |
| Zenith-1 | Player 1, Player 2, Player 3, Player 4 | `Q5X7JB` |
| Cosmos-4 | Player 1, Player 2, Player 3, Player 4 | `T4C6ZF` |
| Vortex-5 | Player 1, Player 2, Player 3, Player 4 | `W9D3GH` |

### 13.2 Sample clues (6 shared clues; real campus places will replace these)

| # | Title (admin only) | Riddle text (what players read) | Code | Location note (private) |
| --- | --- | --- | --- | --- |
| C1 | Notice board | "I carry the news but never speak. Papers hang on me, held by tiny pins. Find the place where students stop to read, and look behind the corner of my frame." | `YEL-7N4W` | SAMPLE: notice board near main entrance |
| C2 | Library | "Silence is my law and stories are my sleep. Thousands of voices rest upon my shelves. Enter my quiet hall and look beneath the table nearest the door." | `MAR-3K9P` | SAMPLE: library reading hall |
| C3 | Canteen | "Where hunger ends and queues begin, where tea is hot and gossip is thin. Stand where you pay for your treat, and look under the stack of trays." | `VEN-5T2X` | SAMPLE: canteen counter |
| C4 | Staircase | "I have many steps but I never walk. Climb me up and climb me down. At my turning point, between two floors, look beneath the rail." | `SAT-8R6D` | SAMPLE: main staircase landing |
| C5 | Old tree | "I give shade without a roof and shelter without a door. Find the oldest of my kind in the open, and look where my roots meet the ground." | `JUP-4H7M` | SAMPLE: largest tree in the ground |
| C6 | Water cooler | "I am cold without a fridge, and everyone visits me when thirsty. Go where cups are filled, and look behind the one who stands guard." | `NEP-9B3C` | SAMPLE: drinking water point |

Riddle writing guidance for the organizer (not for the code): 25 to 45 words, one place per riddle, no room numbers or building names (so other teams cannot guess), end with an instruction on exactly where the code is stuck, code is printed in large letters on a sticker.

### 13.3 Clue import formats
**CSV** (header row required): `title,riddle_text,code,location_note,active`

```
Notice board,"I carry the news but never speak...",YEL-7N4W,"Notice board near entrance",true
```

**JSON:**

```json
[{ "title": "Notice board", "text": "I carry the news ...", "code": "YEL-7N4W", "locationNote": "Notice board near entrance", "active": true }]
```

### 13.4 Team-wise riddles import (for when each team gets its own 6 riddles)
The organizer may give separate riddles to each team (for example 5 or 6 teams times 6 riddles = 30 to 36 clues). The data model already supports this because each team has its own ordered `clueOrder`. The import creates the clues and sets each team's order in one step.

**CSV header:** `team_name,order,title,riddle_text,code,location_note`

```
Nebula-9,1,Notice board,"I carry the news ...",YEL-7N4W,"Notice board near entrance"
Nebula-9,2,Library,"Silence is my law ...",MAR-3K9P,"Library hall"
...
Orion-3,1,Canteen,"Where hunger ends ...",VEN-5T2X,"Canteen counter"
```

Rules: `order` is 1 to 6; every team must have exactly 6 rows; team names must match existing teams (or the import creates them with 4 placeholder members); every code must be unique unless the same physical place is intentionally shared (then the same code on two rows reuses the same clue record).

### 13.5 Auto-shuffle algorithm (shared clue pool)
Given a clue pool `C` of size N (default 6) and teams `T0..Tm`:

- Team `k` (0-based), if `k < N`: take `C` rotated left by `k` (team 0: 1,2,3,4,5,6; team 1: 2,3,4,5,6,1; team 2: 3,4,5,6,1,2; and so on). With up to 6 teams, every team has a different first clue and no two teams are on the same clue at the same position.
- If `k >= N`: take the **reverse** of `C` rotated left by `k - N`.
- If the pool is larger than the per-team number, pick the first N clues of the rotated list that are active.
- The admin may then adjust by hand.

Sample result for 6 teams: Nebula-9 `1,2,3,4,5,6`; Orion-3 `2,3,4,5,6,1`; Pulsar-7 `3,4,5,6,1,2`; Zenith-1 `4,5,6,1,2,3`; Cosmos-4 `5,6,1,2,3,4`; Vortex-5 `6,1,2,3,4,5`.

### 13.6 Seeding
`admin-action: loadSampleData` (requires `confirm: "RESET"`) writes: the `config/event` document with the defaults in Section 7, the 6 teams with their `teamSecrets`, the 6 clues with their `clueSecrets`, and the rotation assignment above. After seeding, teams are all `waiting` and the leaderboard is hidden.

---

## 14. Reliability, mobile and deployment

### 14.1 Mobile and network

- Test on Android Chrome (the real target) over throttled "Fast 3G" in DevTools. Team pages must be usable within 3 seconds.
- Handle: Chrome pull-to-refresh disabled with `overscroll-behavior: none` on `/play`; no text selection on the timer; no zoom-on-focus (inputs 16px+).
- The timer shows local time between syncs, so a dropped network does not freeze it.
- Retries with exponential backoff (1 s, 2 s, 4 s, max 8 s) for `team-state`; `submit-code` is retried once automatically with the same `submissionId`, then the user can press Submit again.
- Use `AbortController` timeouts (8 s) on all fetches.
- Add a minimal `manifest.webmanifest` and theme color. A service worker is **not** required (avoid stale caches during the event).

### 14.2 Firestore and Netlify cost safety

- 10 teams polling every 4 seconds is about 150 requests per minute, well inside Netlify's free limits for a few hours. `team-state` reads one team document and one clue document.
- `leaderboard` polling at 5 seconds reads at most 10 team documents. Cache the response for 3 seconds inside the function instance.
- Admin listeners: `teams`, `config/event`, last 40 `attempts`, `clues` and `clueSecrets` (for the vault), nothing else.

### 14.3 Deployment steps

1. Create the Firebase project, enable Firestore (production mode) and Email/Password auth, add the admin user by hand (Section 9.2), create a service account key.
2. Deploy `firestore.rules`.
3. Create the Netlify site; set the four environment variables (Section 6.5); build command `npm run build`, publish directory `dist`.
4. Open `/ops-x7q/`, sign in, press `LOAD SAMPLE DATA`, run a full test (Section 16), then `RESET EVENT`.
5. Replace the sample clues and teams with the real ones before event day.
6. **Freeze the code 2 days before the event (25 Nov).** After that, only data changes.

### 14.4 Event-day device checklist

- Test on at least 3 different Android phones before the event, including one low-end phone.
- Admin laptop: charged and plugged in, stable internet, a second browser tab already logged in to the control panel, and a hotspot as backup.
- Print the access code slips and keep spare copies.
- Keep the printed list of clue codes and locations as a paper backup.

---

## 15. Build plan for 2 days (milestones)

The agent builds in this order, and tests each milestone before moving on. If time runs short, cut from the bottom of the "Nice to have" list first.

**Day 1**

- **M1: Scaffold.** Vite multi-page, Tailwind with tokens from Section 10, self-hosted fonts, inline icon set, `netlify.toml` (redirects and headers), `config.js`, shared layout and the starfield/glass CSS.
- **M2: Backend core.** Firebase Admin init, `_lib` helpers (normalize, time, rank, auth), functions `team-login`, `team-state`, `submit-code`, `public-config`, `leaderboard`, and `admin-action` with `loadSampleData`, `startTeam`, `pauseTeam`, `resumeTeam`, `stopMission`, `disqualify`, `manualUnlock`. Firestore rules.
- **M3: Team experience.** `/login`, `/play` with the ms timer, clue card, code input, all feedback states and all Page 4 end states.
- **M4: Leaderboard.** `/leaderboard` hidden and revealed states, FLIP reorder, fullscreen.

**Day 2**

- **M5: Admin live.** Hidden path, login, live table with all row actions, global controls, reveal toggle, vault, route matrix, attempt feed.
- **M6: Admin manage.** Teams, Clues, Assignment (up/down buttons first), Settings, Logs and Export (CSV), Danger zone, print slips.
- **M7: Landing.** Hero video processing (Section 11), glass components, sections and countdown.
- **M8: Polish and test.** Run the whole Section 16 list on a real Android phone, fix bugs, deploy.

**Nice to have (cut first if late):** drag-and-drop reordering, glass light-sweep animation, sound, `startAllWaiting`, route matrix warnings, projector fullscreen mode, import team riddles UI (keep the function and use JSON paste).

---

## 16. Acceptance tests (all must pass)

**Team flow**

1. Logging in with a valid code reaches `/play` and shows `MISSION NOT STARTED`.
2. A wrong team code shows `Invalid team code. Check your slip.` and 10 wrong tries from one IP trigger a 30-second lock.
3. When the admin presses START, the waiting screen switches to the game within about 4 seconds and the timer starts at `30:00.000` and counts down smoothly.
4. Refreshing the page keeps the same clue and the correct time left (within 1 second of the server value).
5. Entering the correct code (lowercase, spaces, or without the hyphen) unlocks the next clue.
6. A wrong code shows `Incorrect code. Try again.`, adds nothing to the timer, and appears in the attempt log.
7. A code that belongs to a different clue is rejected exactly like any wrong code.
8. 5 wrong codes within 60 seconds lock input for 30 seconds with a visible countdown, and the timer is unaffected.
9. Solving all 6 clues shows `MISSION COMPLETE` with the total time and **no rank**.
10. Time reaching zero shows `TIME'S UP` and further submissions are rejected.
11. Logging in on a second phone asks for confirmation; after confirming, the first phone shows `SIGNED OUT` on its next poll.
12. Turning airplane mode on for 20 seconds shows `Signal lost. Reconnecting...`, keeps the typed code, the timer keeps counting, and everything recovers when the network returns.
13. The page never contains any secret code or any other team's data in its network responses (check DevTools).

**Admin flow**

14. The control path is not linked from any public page, and `/robots.txt` does not mention it.
15. Signing in with a wrong password fails with a generic message; the correct admin signs in; a different Firebase user (if one is created for testing) is rejected with `Access denied.`
16. PAUSE freezes that team's timer on its phone and disables input; RESUME restores it with no lost time.
17. `+/- TIME` and `PENALTY` change the team's time left and are logged with a reason.
18. `UNLOCK NEXT` advances the team and shows `ADMIN UNLOCK` in the log.
19. `DISQUALIFY` locks the team within about 4 seconds; `RE-QUALIFY` restores it.
20. `STOP MISSION` locks every running team and sets them to time up with their progress saved.
21. Editing a clue's secret code takes effect on the next submission.
22. Editing a team's name updates everywhere, including the leaderboard.
23. Auto-shuffle gives the rotation in Section 13.5 and warns on duplicate first clues.
24. CSV exports open correctly and contain the columns in Section 12b.
25. `PRINT ALL CODES` produces one slip per team.

**Leaderboard and landing**

26. With reveal off, `/api/leaderboard` returns **no team names or scores**, and the page shows `RESULTS ARE ENCRYPTED`.
27. After reveal, the ranking follows Section 5.6, top 3 are highlighted, and disqualified teams are last without a rank.
28. The Landing page shows the looping video behind glass cards with a visible highlighted border; text stays readable on the brightest frame; with `prefers-reduced-motion` it shows the poster only.
29. The Landing page has no admin link, shows all 9 rules, and loads quickly on throttled mobile data.
30. Lighthouse mobile performance for `/login` and `/play` is 90 or higher.

---

## 17. Do NOT build (found in the design mockups but not part of the event)

- Points, scores, accuracy, XP, ranks by points, rank tiers or callsign names on the leaderboard (ranking is clues solved, then time).
- Phone battery, signal strength, latency, frequency, GPS, latitude and longitude, geo-fence, "Orbit #", port numbers, SHA-256 or encryption readouts.
- Sector names, building names, "Science Quad", "Central Rotunda", "Library & Terraces", any location label inside a clue screen (these hint the answer).
- Department names ("CS & IT") or any organizer names that were not given.
- The 4-portal "Operational Gateways" section and any public link to the admin panel.
- Designer tools: the telemetry simulator, state switchers, preset test codes (`NOVA42`, `ERR999`, `SYNC01`), "Reset simulator state", device profile panels.
- Hints, image clues, audio clues, payments, registration, team chat.
- "Zero Collision" claims; use "Different route for every team".
- The Material Symbols font, any CDN script, the Tailwind CDN.
- A countdown to the leaderboard unlock (the reveal is a manual admin action).

---

## 18. Assumptions and open items (write these into `ASSUMPTIONS.md`, owner may change them)

1. **Number of teams:** built for 1 to 10; 6 seeded. (The owner mentioned both 5 and 6.)
2. **Riddles:** sample shared pool of 6. If each team gets its own unique 6 riddles, use the team-wise import (Section 13.4); no code changes are needed.
3. **Team access code:** 6 characters, from a set without confusing letters. **Clue codes:** `XXX-XXXX` style alphanumeric, example `YEL-7N4W`, case and hyphen ignored.
4. **Anti-spam lockout** kept (5 wrong per minute, lock 30 s), because it protects against brute-force guessing; it never changes time or rank. Editable or can be turned off.
5. **Admin path** is `/ops-x7q/` (changeable constant). Only one admin email is allowed.
6. **Logo:** placeholder `logo.svg`: a ring with a four-point compass star inside and a small orbit arc (space plus treasure map). Replace with the real logo when it arrives (same filename).
7. **Hero video:** supplied portrait video, processed per Section 11; replace later with a landscape version if available.
8. **Own phones** are used by teams (rule 5 allows a phone only to open this site).
9. **Time zone:** all displayed event times are India Standard Time.
10. **Timer display** uses milliseconds on the team screen and leaderboard; the admin table uses whole seconds.

---

## 19. Kickoff prompt (paste this into Antigravity)

```
You are the lead developer for COSMIC HUNT, a college treasure hunt web app for
Nirmala Memorial Foundation College of Commerce & Science, event date 27 Nov 2026.

1. Read AGENTS.md fully (it is the complete spec), then open every file inside
   design-reference/ (screen.png and code.html for landing, team-login, team-game,
   leaderboard, admin-live, plus DESIGN.md) as visual references.
2. Where the mockups and AGENTS.md disagree, AGENTS.md wins. Section 17 lists
   mockup elements you must NOT build.
3. Stack: Vite multi-page + vanilla JS + compiled Tailwind, Netlify Functions
   (Node 20, ESM) with firebase-admin, Firestore, Firebase Auth for the admin only.
   Self-host fonts, use inline SVG icons, no CDN scripts.
4. Produce an implementation plan first (milestones M1 to M8 from Section 15),
   then build milestone by milestone. After each milestone run the matching tests
   from Section 16 and fix failures before continuing.
5. Never put the admin password or any secret in code. Use environment variables
   (Section 6.5). The admin user is created manually in the Firebase console.
6. All game logic is server-side. Team browsers never read Firestore and never
   receive secret codes or future clues.
7. Team pages must stay under 120 KB gzipped (excluding fonts) and be fast on
   Android Chrome over mobile data.
8. Record any decision you had to make in ASSUMPTIONS.md. Do not invent features.
9. Finish with a README.md that explains: setup, environment variables, deploy to
   Netlify, how to load sample data, how to import the real riddles, and the
   event-day runbook from Section 4.
```

*End of document.*
