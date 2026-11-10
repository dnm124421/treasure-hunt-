// Single source of truth for all event copy and rules
export const EVENT = {
  name: 'COSMIC HUNT',
  college: 'Nirmala Memorial Foundation College of Commerce & Science',
  tagline: 'Decode the campus. Reach the stars.',
  dateLine: '27 Nov 2026 | 10:00 AM',
  dateIso: '2026-11-27T10:00:00+05:30',
};

export const RULES = [
  'Each team has exactly 4 players.',
  'The game is played inside the college premises only.',
  'Teams must report 1 hour before their game starts.',
  'Each team gets 30 minutes of play time.',
  'Phones used for outside help, or any unfair means, lead to disqualification. (A phone may be used only to open this website.)',
  'No cross-teaming and no outside help.',
  'Cheating, disrespect or misbehaviour leads to disqualification.',
  'Match timing is not changed once the team has started.',
  "The organizers' decision is final.",
];

export const STEPS = [
  { title: 'READ THE RIDDLE', desc: 'Read your riddle on your phone. Each riddle points to a place on campus.' },
  { title: 'FIND THE CODE', desc: 'Go to that place with your teammates and find the hidden code on a sticker or card.' },
  { title: 'ENTER THE CODE', desc: 'Type the code on the game screen and press Submit. Spaces and hyphens are fine.' },
  { title: 'UNLOCK NEXT CLUE', desc: 'A correct code unlocks the next riddle. Solve all 6 within 30 minutes.' },
];

export const HERO_PARA = 'Teams of 4 solve riddles, find hidden codes around the campus, and unlock the next clue. 6 clues. 30 minutes. Fastest team wins.';

export const COUNTDOWN_NOTE = "Report to the mission desk 1 hour before your team's start. The organizers will call your team.";

export const MESSAGES = {
  loginHelper: 'Type the 6-character access code printed on your official team slip.',
  invalidCode: 'Invalid team code. Check your slip.',
  networkError: 'Signal lost. Check your connection and try again.',
  submitError: 'Could not reach the server. Retrying...',
  wrongCode: 'Incorrect code. Try again.',
  networkDrop: 'Network dropped. Your code is saved.',
  offlineBanner: 'Signal lost. Reconnecting...',
};
