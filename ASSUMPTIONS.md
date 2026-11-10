# ASSUMPTIONS & DESIGN DECISIONS: COSMIC HUNT

This document records architectural decisions, assumptions, and configuration defaults made during the development of COSMIC HUNT for Nirmala Memorial Foundation College of Commerce & Science (27 Nov 2026).

## 1. Number of Teams
- Built to dynamically support 1 to 10 teams.
- Seeded with 6 official sample teams: Nebula-9 (`K7M4PX`), Orion-3 (`R3T9WC`), Pulsar-7 (`H8N2VD`), Zenith-1 (`Q5X7JB`), Cosmos-4 (`T4C6ZF`), Vortex-5 (`W9D3GH`).
- Teams and members (4 per team) are fully editable at any time via the hidden Admin Management panel.

## 2. Riddles and Clue Pool
- Seeded with a default pool of 6 campus riddles (Notice board, Library, Canteen, Staircase, Old tree, Drinking water point).
- Supports both shared rotating clue pool (auto-shuffle algorithm ensuring no two teams start at the same clue) and unique per-team riddles (via CSV/JSON import).
- Secret codes follow `XXX-XXXX` alphanumeric format (e.g., `YEL-7N4W`). Codes are normalized (uppercase, spaces and hyphens stripped) for comparison.

## 3. Anti-Spam Lockout
- Default settings: 5 wrong attempts within 60 seconds triggers a 30-second lockout on the submission input with a live countdown timer.
- Lockout does not modify the main 30-minute game countdown timer and incurs no score penalty.
- Configurable or disableable in Admin Settings.

## 4. Admin Access & Path
- Admin interface is located at hidden URL `/ops-x7q/` (Command Center) and `/ops-x7q/manage` (Management).
- Secured via Firebase Authentication and server-side allowlist (`ADMIN_EMAILS`, default: `dnm124421@gmail.com`).
- Admin path is excluded from all public links, navigation, and robots.txt.

## 5. Timing & Milliseconds
- Countdown starts strictly upon manual Admin "Start" action for each team (independent team clocks).
- Team game HUD displays high-precision time formatted as `MM:SS.mmm` using `requestAnimationFrame` synchronized with server timestamp offsets.
- Admin dashboard displays whole seconds `MM:SS` for clarity and reduces DOM reflow overhead during live monitoring.

## 6. Video & Visual System
- Hero video: Looping background with dark gradient scrim (`rgba(3,6,15,.6)`) and backdrop blur on cards.
- Respects `prefers-reduced-motion` and `navigator.connection.saveData` by falling back to a still poster and pure CSS starfield.
- Game HUD uses battery-efficient pure CSS starfield without canvas or backdrop-filter blur.

