// Canned small talk for the explorers you meet. Picks a reply by keyword so the chat feels alive.

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

const GREET = ['Hey! 👋', 'Hi there!', 'Hello hello!', 'Namaskara! 🙏', 'Hey, nice to meet you!'];
const HOW = ['All good, just wandering around.', 'Great! Loving this city.', 'Bit tired — been walking since Majestic 😅', 'Doing well! You?'];
const TIPS = [
  'Try the filter coffee near Brigade Road, it is the best.',
  'Lalbagh at golden hour is unreal.',
  'The metro is the fastest way across the city.',
  'Watch out for Silk Board, the jam never ends 🚗🚗🚗',
  'There is a petrol pump near Vidhana Soudha if you run dry.',
  'Grab a bike — the airport road is long.',
];
const GAME = ['Sure, let us play! Pick a game from the menu 🎮', 'A race? You are on! 🏁', 'I never lose at 8-ball 🎱', 'Prize hunt! I love that one 💰'];
const YES = ['Yes!', 'Totally.', 'For sure 😄', 'Yep yep.'];
const BYE = ['See you around!', 'Bye! Come find me later.', 'Catch you at MG Road!', 'Take care! 👋'];
const THANKS = ['Anytime!', 'No problem 😊', 'You are welcome!'];
const GENERIC = [
  'Haha nice.', 'True!', 'Tell me more?', 'I was just thinking that.', 'Cool cool.', 'Have you been to Cubbon Park yet?',
  'This city is huge, I keep getting lost.', 'Want to hang out? Pick it from the menu.', 'Let us find some hidden cash 💰',
];
const FRIEND_EXTRA = ['So glad we are friends 🤝', 'Friends stick together in this city!'];

export function reply(text: string, opts: { friend: boolean; name: string; you: string }): string {
  const t = text.toLowerCase();
  let out: string;
  if (/\b(hi|hello|hey|namaste|namaskara|yo)\b/.test(t)) out = pick(GREET);
  else if (/how are|how r|whats up|what's up|sup\b/.test(t)) out = pick(HOW);
  else if (/where|how do|how to|tip|best|recommend|food|eat|coffee|go\b/.test(t)) out = pick(TIPS);
  else if (/race|game|play|pool|8.?ball|hunt|prize/.test(t)) out = pick(GAME);
  else if (/thank|thx|ty\b/.test(t)) out = pick(THANKS);
  else if (/bye|see you|cya|later/.test(t)) out = pick(BYE);
  else if (/\?$/.test(t)) out = pick(YES);
  else out = pick(GENERIC);
  if (opts.friend && Math.random() < 0.25) out += ' ' + pick(FRIEND_EXTRA);
  if (Math.random() < 0.2) out = out.replace(/!$/, `, ${opts.you}!`);
  return out;
}

export const HELLO_WHEN_NEAR = ['Hey, come say hi!', 'Oh hi! 👋', 'Nice hat!', 'Want to race? 🏁', 'Have you seen the airport plane?', 'Hi! I am new here too.'];
export const HANGOUT_LINES = [
  'This is fun!', 'Where are we going?', 'Slow down, I cannot keep up 😅', 'Let us get a coffee.', 'Look at that sky.',
  'I love this street.', 'Race you to the next corner!', 'Do you come here often?',
];
export const RACE_TRASH = ['Eat my dust! 💨', 'Too slow!', 'Catch me if you can 🏁', 'Nice try!'];
export const RACE_GG = ['Good race! You are quick.', 'Okay okay, you win 🏆', 'Rematch sometime?'];
