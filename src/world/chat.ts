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
  const ice = iceReply(text);
  if (ice) return ice;
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

// ---- icebreakers: openers you can tap on someone's card, and how the locals answer them
export const ICEBREAKERS: [string, string[]][] = [
  ['Chai or coffee?', ['Chai, always ☕', 'Coffee. Strong. No arguments.', 'Chai at Chai Corner, want to go?']],
  ['Beach or club tonight?', ['Beach first, club later 🌊', 'Bass Drop Club, obviously 🎧', 'Beach. I burn out in clubs.']],
  ['Which city are you from?', ['Kochi! Well, the real one 😄', 'Bengaluru, but my heart is at Sunset Beach.', 'Guess! I will give you three tries.']],
  ['Race me to the beach?', ['You are on 🏁', 'Only if I get the jeep.', 'Loser buys ice cream?']],
  ['What is your go-to karaoke song?', ['Anything by AR Rahman 🎤', 'I only sing when nobody is listening.', 'Come to Karaoke Kingdom and find out.']],
  ['Dogs or cats?', ['Dogs. Have you seen the strays here?', 'Cats. Independent, like me.', 'Both. I am not choosing.']],
  ['Have you crossed the Harbour Bridge yet?', ['Yes! The lighthouse view is unreal.', 'Not yet, take me?', 'Twice. Windmill Hill is my spot.']],
  ['Biryani or momos?', ['Biryani Box, every single time.', 'Momo Van. Fight me.', 'Why not both from the food trucks?']],
  ['Sunrise or sunset person?', ['Sunset at Lighthouse Point 🌅', 'Sunrise. I am the annoying early one.', 'Sunset, with company.']],
  ['Want to try the Ferris wheel?', ['Yes!! It is by the beach.', 'Only if you do not shake the gondola.', 'I have been waiting for someone to ask.']],
  ['What brought you here today?', ['Bored, then I found this city.', 'A friend sent me the link.', 'The zombies. I keep losing.']],
  ['Pick a superpower.', ['Teleporting to the beach.', 'Reading minds. Yours first.', 'Flying over the speedway.']],
  ['Best food truck?', ['Taco Truck, no contest.', 'Burger Bus at 2 am.', 'Biryani Box. Always Biryani Box.']],
  ['Are you a good driver?', ['Terrible. Get in.', 'I won the race twice. Ask around.', 'I crash into the pier every time.']],
  ['Favourite spot in the city?', ['The pier bench at night.', 'Skyline Rooftop Bar.', 'The campfire at Mirror Lake.']],
  ['Would you survive zombie night?', ['I have survived four waves. You?', 'Absolutely not. I hide in the mall.', 'With you covering me, maybe.']],
];
export function iceReply(text: string): string | null {
  const t = text.trim().toLowerCase();
  const hit = ICEBREAKERS.find(([q]) => q.toLowerCase() === t);
  return hit ? pick(hit[1]) : null;
}
export function randomIcebreakers(n = 3): string[] {
  return [...ICEBREAKERS].sort(() => Math.random() - 0.5).slice(0, n).map(([q]) => q);
}

// ---- things they say on a date, by spot
export const DATE_LINES: Record<string, string[]> = {
  pier: ['Listen to the waves…', 'I could sit here all night.', 'The lighthouse is blinking at us.', 'Do you come to the beach a lot?', 'This is nice. Just this.'],
  candle: ['Candles. You planned this?', 'The sea sounds louder at night.', 'Cheers 🥂', 'Tell me something nobody here knows about you.', 'Okay, this is a proper date.'],
  sunset: ['Look at that colour!', 'Sunsets are better with company.', 'Make a wish before it goes.', 'Every sunset here is different.', 'Stay till it is dark?'],
  wheel: ['Do not look down. Okay, look down.', 'We can see the whole city from here!', 'Is that the speedway? Tiny!', 'One more round?', 'Best seat in the city.'],
  boat: ['Careful, it rocks 🚤', 'The lighthouse looks different from the water.', 'I love the smell of the sea.', 'Next stop: the middle of nowhere.', 'Should we anchor here a while?'],
  camp: ['The fire is nice.', 'Marshmallows would make this perfect.', 'Look at the stars over the lake.', 'Tell me a scary story.', 'Warm here, is it not?'],
  sofa: ['Nice place!', 'So this is where you live.', 'Cosy. Very cosy.', 'What is on the TV?', 'I like the view from your window.'],
};
export const GIFT_THANKS: Record<string, string[]> = {
  '🌹': ['A rose! You are sweet 🌹', 'Nobody has given me a rose here before 🥹', 'Okay, now I am blushing.'],
  '🍦': ['Ice cream! My favourite 🍦', 'You remembered! …Or guessed. Still counts.', 'Mango? Please say mango.'],
  '☕': ['Chai! You know me ☕', 'Perfect timing, I needed this.', 'Chai people are the best people.'],
  '🧸': ['A teddy!! 🧸', 'I am naming it after you.', 'This is going on my sofa.'],
  '🍫': ['Chocolate 🍫 you are dangerous.', 'Sharing? …Fine, half.', 'How did you know?'],
  '💌': ['A note? *reads it twice* 💌', 'I am keeping this.', 'That is the nicest thing anyone said today.'],
};
