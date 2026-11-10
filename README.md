# COSMIC HUNT 🚀
### College Treasure Hunt Web Application & Live Command Center
**Event:** COSMIC HUNT  
**College:** Nirmala Memorial Foundation College of Commerce & Science  
**Event Date & Time:** 27 November 2026, 10:00 AM IST  

---

## 🌟 Overview

COSMIC HUNT replaces paper clues and manual scorekeeping with a fast, responsive, mission-control style web application. Teams of 4 players solve campus riddles, locate hidden alphanumeric transmission codes placed physically around campus, decrypt sequential waypoints, and compete for the fastest time within a 30-minute window.

---

## 🛠️ Technology Stack

- **Frontend:** Multi-page application built with Vite, vanilla JavaScript (ES modules), and compiled Tailwind CSS.
- **Visuals & Atmosphere:** Fixed looping background video with glassmorphism cards (`backdrop-filter`) and border light sweep effects on the Landing page; battery-efficient pure CSS starfield on game and login screens.
- **Audio & Haptics:** Web Audio API synth feedback (correct/wrong audio chimes) and `navigator.vibrate` haptic pulses.
- **Game Timing:** High-precision client countdown with milliseconds (`MM:SS.mmm`) synchronized with server timestamps and `requestAnimationFrame`. Screen wake-lock API keeps devices awake outdoors.
- **Backend / API:** Netlify Functions (Node 20, ESM) with Firebase Admin SDK, Firestore data architecture, and single-device session tokens (HS256).
- **Local Dev Server:** Built-in dev middleware in `vite.config.js` simulates the full serverless API with zero external dependencies required for immediate local testing.

---

## 📁 Project Architecture & URLs

| URL | Route File | Purpose |
| :--- | :--- | :--- |
| `/` | `index.html` | Public Landing page with looping video background, live event countdown, stat counters, 4-step mission walkthrough, 9 official directives, and glass cards. |
| `/login` | `src/login.html` | Team Login with 6-box access code input, active device check, and collapsible rules. |
| `/play` | `src/play.html` | Live Team Game HUD with big millisecond timer, 6-segment progress, riddle card, decrypt input, solved clues tray, and all end states (Waiting, Paused, Time's Up, Complete, DQ, Stopped). |
| `/leaderboard` | `src/leaderboard.html` | Public Leaderboard: Sealed encrypted state by default (no names leaked); revealed state with podium medals (Gold, Silver, Bronze), smooth FLIP animations, and Fullscreen Projector mode. |
| `/ops-x7q/` | `src/ops-x7q/index.html` | **Hidden** Admin Live Command Center: Real-time table monitoring, Start/Pause/Resume, +/- Time, Penalties, Manual Unlocks, Clue Vault (with Show Codes toggle), Route Matrix, and Live Attempt feed. |
| `/ops-x7q/manage` | `src/ops-x7q/manage.html` | **Hidden** Admin Management: Team roster edits, access code generator, printable slip cards (`window.print()`), Clue pool management, auto-shuffle path rotation, settings, audit logs, and CSV exports. |

---

## 🚀 Quickstart & Local Development

### 1. Prerequisites
- Node.js v20+ or v24
- npm

### 2. Installation
```bash
npm install
```

### 3. Run Dev Server
```bash
npm run dev
```
Open `http://localhost:5173/` in your browser.

- **Landing Page:** `http://localhost:5173/`
- **Team Login:** `http://localhost:5173/login`
- **Leaderboard:** `http://localhost:5173/leaderboard`
- **Admin Command Center:** `http://localhost:5173/ops-x7q/`

---

## 🔑 Default Credentials & Sample Data

### Admin Clearance
- **URL:** `/ops-x7q/`
- **Email:** `dnm124421@gmail.com`
- **Password:** Type your administrator password (in local mode, entering `dnm124421@gmail.com` grants access).

### Sample Teams (6 Teams Seeded)
| Team Name | Sample Access Code | Starting Waypoint |
| :--- | :--- | :--- |
| **Nebula-9** | `K7M4PX` | Clue 1 (Notice board) |
| **Orion-3** | `R3T9WC` | Clue 2 (Library) |
| **Pulsar-7** | `H8N2VD` | Clue 3 (Canteen) |
| **Zenith-1** | `Q5X7JB` | Clue 4 (Staircase) |
| **Cosmos-4** | `T4C6ZF` | Clue 5 (Old tree) |
| **Vortex-5** | `W9D3GH` | Clue 6 (Water cooler) |

### Sample Secret Clue Codes
- Clue 1 (Notice board): `YEL-7N4W`
- Clue 2 (Library): `MAR-3K9P`
- Clue 3 (Canteen): `VEN-5T2X`
- Clue 4 (Staircase): `SAT-8R6D`
- Clue 5 (Old tree): `JUP-4H7M`
- Clue 6 (Water cooler): `NEP-9B3C`

*(Codes are insensitive to case, spaces, or hyphens: `yel7n4w`, `yel-7n4w`, and `YEL 7N4W` are all accepted)*.

---

## 🌐 Production Deployment (Netlify + Firebase)

### 1. Firebase Project Setup
1. Create a Firebase project in the [Firebase Console](https://console.firebase.google.com/).
2. Enable **Firestore Database** in production mode.
3. Enable **Authentication** with Email/Password provider.
4. Add the administrator user: `dnm124421@gmail.com` and set your secret password.
5. Generate a **Service Account Key** (Project Settings -> Service Accounts -> Generate new private key). Encode the JSON file to base64:
   ```bash
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("service-account.json"))
   ```
6. Deploy `firestore.rules`:
   ```bash
   firebase deploy --only firestore:rules
   ```

### 2. Netlify Setup
1. Connect this repository to your Netlify dashboard.
2. In Netlify Site Settings -> **Environment variables**, set:
   - `FIREBASE_SERVICE_ACCOUNT_B64`: Your base64-encoded service account key
   - `SESSION_SECRET`: A secure random 64-character string for signing team tokens
   - `ADMIN_EMAILS`: `dnm124421@gmail.com`
   - `NODE_VERSION`: `20`
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Deploy!

---

## 📋 Event-Day Organizer Runbook

### Before the Event (Setup)
1. Log into `/ops-x7q/`.
2. Go to **Manage Data** -> **Teams**: verify or edit the 4 member names for each team.
3. Click **Print All Slips** to print official physical cards for each team with their access code and the 9 directives.
4. Go to **Manage Data** -> **Clues**: verify the secret codes and location notes. Stick physical cards/stickers with the codes at the corresponding campus locations.
5. In **Assignment**, click **Auto-Shuffle All** to ensure each team has a staggered starting waypoint.
6. Check `/leaderboard`: Ensure the toggle is set to **HIDDEN** (displays "Results Are Encrypted").

### During the Event
1. Teams report 1 hour before start time and receive their access code slips.
2. Teams log in on their Android phones at `/login` and see the **Waiting** screen.
3. The Admin clicks **START** on each team row as they are flagged off from the starting desk.
4. As teams solve clues and enter codes, the Admin monitors live times and wrong attempts.
5. Use **PAUSE** if a team needs an on-ground organizer check, or **UNLOCK** if a physical clue sticker was disturbed.

### After the Event
1. Click **STOP MISSION** to freeze any ongoing clocks.
2. Switch to the auditorium projector with the `/leaderboard` screen and click **Projector Mode**.
3. In Command Center, toggle **REVEAL LEADERBOARD**.
4. The public leaderboard immediately updates with gold/silver/bronze rankings, total times, and clues solved.
5. Go to **Manage Data** -> **Logs & Export** and click **Export Results (CSV)** for records and prize distribution.

