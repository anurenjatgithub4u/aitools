// Landing pages, one per search intent. Each targets a cluster of long-tail keywords (high intent,
// low competition: "no download", "in browser", "with friends", "kerala/malayalam") and drops the
// visitor straight into that game via /?start=… so the page delivers exactly what the query asked for.

export interface PlayPage {
  slug: string;
  start: string;                 // quick-start kind for /?start=
  title: string;                 // <title> — the primary keyword first
  h1: string;
  description: string;           // meta description, ≤ 160 chars
  keywords: string[];            // the cluster this page owns
  icon: string;
  intro: string;                 // first paragraph: primary keyword in the first sentence
  sections: [string, string][];  // h2 + paragraph
  faq: [string, string][];       // FAQ rich result
}

export const PLAY_PAGES: PlayPage[] = [
  {
    slug: 'cricket-game-online', start: 'cricket', icon: '🏏',
    title: 'Cricket Game Online Free — Play in Browser, No Download (Bat & Bowl)',
    h1: 'Play a free cricket game online — bat and bowl in your browser',
    description: 'Free online cricket game with a toss, timing-based batting, running between the wickets and a speed-and-line bowling panel. No download, works on phone.',
    keywords: [
      'cricket game online free', 'play cricket online without download', 'cricket game in browser',
      'online cricket game for mobile', 'cricket batting game online', 'cricket bowling game online',
      'free cricket game no download', '3d cricket game browser', 'cricket game for android browser',
      'bat and bowl cricket game online', 'cricket game no sign up', 'best free cricket game online',
      'cricket game to play with friends', 'multiplayer cricket game online free', 'india cricket game online free',
      'how to play cricket online free', 'online cricket no app', 'free cricket game for pc browser',
      'cricket game 1 over 5 over online', 'kerala cricket game online', 'quick cricket game online',
      'cricket game with toss online', 'bat or bowl first cricket game', 'cricket timing game online',
    ],
    intro: 'FindurAI has a free cricket game online that you play inside a 3D city — walk onto the strip at the FindurAI Cricket Ground, press E, call the toss and choose whether to bat or bowl first. No app to install, no sign-up, and it runs on a phone browser as well as a laptop.',
    sections: [
      ['The toss, then the match', 'Choose 1, 2, 3 or 5 overs a side and call the toss in the air. Win it and you pick: bat first and set a target, or bowl first and chase a number you can see. Lose it and your rival chooses. Both sides bat the same number of overs, and the side that has not batted fields a full ring.'],
      ['Batting is all in the timing', 'Shuffle across the crease with ◀ ▶ and press Bat as the ball arrives. Perfect timing sends it for six, early pulls it high where a fielder can catch it, late squeezes it along the ground, and a straight one you miss bowls you. After a shot press Run to take runs with the non-striker — press again for a second, but the fielder throws at your stumps, so a lazy second run gets you run out.'],
      ['Bowling an over', 'Before every ball you pick the speed (slow, medium, fast) and the line (leg, stumps, off), tap Bowl to run in and press Bowl again at the top of your action. Release it right and the batter is beaten or bowled; release it late and it goes for four. Wickets and dot balls earn points, winning the match earns 200.'],
      ['Play with a friend', 'The cricket ground is in a shared multiplayer city. Meet a friend at the ground, watch each other bat, chat between overs, or race there on bikes first. Real players see each other in real time; the opponent in the match itself is an AI batter or bowler for now.'],
    ],
    faq: [
      ['Is the cricket game free?', 'Yes. FindurAI is completely free and runs in the browser — nothing to download.'],
      ['Does it work on a phone?', 'Yes. There is a joystick and Bat / Bowl / Run buttons on phones; on a laptop you use the keyboard.'],
      ['How long is a match?', 'A one-over match takes about three minutes; five overs a side takes around fifteen.'],
      ['Can I choose to bat or bowl first?', 'Yes. Every match starts with a toss — call heads or tails, and if you win it you choose to bat first or to bowl first.'],
    ],
  },
  {
    slug: 'football-game-online', start: 'football', icon: '⚽',
    title: 'Football Game Online Free — 5-a-Side Match in Your Browser, No Download',
    h1: 'Free online football game — five-a-side at City Stadium',
    description: 'Play a free 5-a-side football game online: dribble, pass, shoot, keepers and passing AI, 90-second matches. In the browser on phone or PC, no download.',
    keywords: [
      'football game online free', '5 a side football game online', 'play football game in browser',
      'football game no download', 'online football game for mobile', 'soccer game online free browser',
      'free football game to play now', 'free soccer game no install', 'football game for android browser',
      'multiplayer football game online free', 'best free football game browser',
      'football game to play with friends online', '3d football game online free', 'football game no sign up',
      'how to play football online free', 'online football no app', 'five a side soccer game browser',
      'football game india free online', 'football kick game online', 'penalty kick game online free',
    ],
    intro: 'The free football game online in FindurAI is a five-a-side match on a full 56 × 36 m pitch at City Stadium, with goals, keepers, stands and floodlights. Walk onto the pitch and press E, or pick Football from the start screen, and the match kicks off.',
    sections: [
      ['How to play', 'Run into the ball to dribble — it sticks to your feet. Press Kick (Space on a keyboard) to shoot: harder while sprinting, and aimed toward the goal when you face it. Your four blue-bib team-mates pass and defend; the red team has a keeper and counters. Matches are 90 seconds, first to five wins, and the scoreboard sits at the top of the screen.'],
      ['Tips', 'Sprint before you shoot for power. Face the goal — shots are aim-assisted when you do. Do not dribble into the keeper; pass wide and let a team-mate finish. The camera starts high and wide so you can see the whole pitch.'],
      ['More than football', 'The stadium is one place in a shared 3D city with a cricket ground, a race track, a beach, bars and a casino. Meet real people there, chat and hang out between matches.'],
    ],
    faq: [
      ['Is it multiplayer?', 'The city is multiplayer — you see real players and can chat and meet them. The match itself is you plus AI team-mates against an AI team.'],
      ['Do I need to install anything?', 'No. It runs in Chrome, Safari or Edge on any phone or computer.'],
    ],
  },
  {
    slug: 'zombie-game-online', start: 'zombies', icon: '🧟',
    title: 'Zombie Game Online Free — Survive Zombie Night in a 3D City (No Download)',
    h1: 'Free zombie survival game online — zombie night in FindurAI City',
    description: 'A free zombie survival game in the browser: waves of walkers, runners, crawlers, hoppers, bloaters and brutes take over a 3D city. Punch, drive, survive. No download.',
    keywords: ['zombie game online free', 'zombie survival game browser', 'zombie game no download', 'play zombie game online', '3d zombie game in browser', 'zombie game for mobile browser', 'free zombie apocalypse game online'],
    intro: 'FindurAI\'s zombie game online turns a whole 3D city into a survival arena. When zombie night falls, waves come from every direction — walkers, headless ones, runners, crawlers, hoppers that leap at you, bloaters that burst in a cloud and brutes that hit like a truck.',
    sections: [
      ['How to survive', 'Space punches the zombie in front of you (three hits each). Cars crush them — a jeep at speed is the best weapon in the city. Every bite drains your health; clearing a wave heals you. You cannot outrun them for long, so fight near a vehicle, use the bridge, and keep moving.'],
      ['When does it start?', 'Zombie night comes on its own: a countdown chip at the top of the screen shows when. Or pick Zombie night on the start screen to jump straight in. Die and you wake up back downtown — no progress lost.'],
      ['Play with friends', 'The city is shared. Bring a friend, drive together, and hold a corner of Neon Lane while the horde comes down the road.'],
    ],
    faq: [
      ['Is the zombie game scary or gory?', 'It is a low-poly, cartoon-style city — weird and fun rather than gory.'],
      ['Does it work on phones?', 'Yes, with a joystick and a Punch button.'],
    ],
  },
  {
    slug: 'car-racing-game-online', start: 'race', icon: '🏁',
    title: 'Car Racing Game Online Free — 960 m Speedway in Your Browser, No Download',
    h1: 'Free car racing game online — the FindurAI Speedway',
    description: 'Race a 960 m GP-style circuit against three rivals: boost pads, nitro, a valley run and a hairpin. Jeeps, tuk-tuks and bikes. Free, in the browser, no download.',
    keywords: ['car racing game online free', 'racing game in browser no download', 'bike racing game online', 'tuk tuk racing game', 'free racing game play now', 'online racing game for mobile browser', '3d racing game browser'],
    intro: 'The car racing game online in FindurAI runs on the FindurAI Speedway: a 960 m circuit south of the city with a pit straight, the Sunset sweeper, the Neon chicane, a long Valley run, Big Bend and a hairpin under the grandstand.',
    sections: [
      ['How a race works', 'Pick 1 to 5 laps against three rivals. Hologram arrows show the racing line, green boost pads give a burst, Shift is nitro — and the rivals have nitro too. A wrong-way warning tells you if you have spun around. Positions and sector times sit at the top of the screen.'],
      ['Which vehicle?', 'Jeeps are stable, bikes are quick and twitchy, tuk-tuks are for laughs. Every vehicle has a petrol tank — top up at the ⛽ station before a five-lap race.'],
      ['Beyond the track', 'The Speedway is one corner of a 3D city you can drive around freely: over the Harbour Bridge to Eastside, along the beach, through Neon Lane at night. Give a friend a lift and ride together.'],
    ],
    faq: [
      ['Is there multiplayer racing?', 'You race AI rivals; real friends can watch, drive alongside and ride with you. Head-to-head racing between real players is coming.'],
      ['Keyboard or touch?', 'W/S drive, A/D steer, Shift nitro on a keyboard; joystick and Boost button on phones.'],
    ],
  },
  {
    slug: '8-ball-pool-online', start: 'pool', icon: '🎱',
    title: '8 Ball Pool Online Free — Real 3D Table, No Login, No Download',
    h1: 'Play 8-ball pool online free — a real 3D table at the Neon Palace',
    description: 'Free 8 ball pool online with real rules on a 3D table: aim, set power, shoot; solids and stripes, ball in hand on a scratch, sink the 8 last. No login, no download.',
    keywords: ['8 ball pool online free', 'play 8 ball pool without login', 'pool game online browser', '8 ball pool no download', 'billiards game online free', '3d pool game in browser', 'pool game to play with friends online'],
    intro: 'Play 8 ball pool online free inside the Neon Palace — the casino and club in FindurAI City has two real 3D tables. Walk up to one and press E, or pick 8-ball on the start screen.',
    sections: [
      ['How to play', 'Hold ◀ ▶ to aim (Shift for fine adjustment on a keyboard), set the Power slider and press Shoot. Real rules: the first pot decides solids or stripes, a scratch gives your opponent ball in hand, and you must sink the 8 last. The camera sits high over your shoulder so the whole table is in view.'],
      ['The Neon Palace', 'A dance floor with chasing tiles, a DJ, a bar, slot machines, a roulette table and lasers inside and over the roof. Dance with whoever came with you, then rack up.'],
      ['With friends', 'Meet a friend at the Palace — you see each other at the table and can chat while you play. Carrom, chess and Ludo are here too.'],
    ],
    faq: [
      ['Do I need an account?', 'No. Pick a name and an avatar and play.'],
      ['Is it real 8-ball rules?', 'Yes — solids and stripes, fouls, ball in hand, 8 last.'],
    ],
  },
  {
    slug: 'carrom-game-online', start: 'carrom', icon: '🎯',
    title: 'Carrom Game Online Free — Play Carrom Board in Your Browser, No Download',
    h1: 'Play carrom online free — a real board with striker, queen and pockets',
    description: 'Free online carrom game: slide the striker, aim, set the power and flick. White vs black, red queen worth three, top-down 3D board. In the browser on phone or PC.',
    keywords: [
      'carrom game online free', 'play carrom online', 'carrom board game online browser',
      'carrom game no download', 'online carrom for mobile', 'carrom game with friends online',
      'kerala carrom game', 'carrom disc pool online free', 'carrom game no sign up',
      'carrom board online multiplayer', 'free carrom game for android browser', 'best carrom game online free',
      'carrom striker game online', '3d carrom game browser', 'indian carrom game online free',
      'how to play carrom online', 'carrom board game for pc browser', 'carrom game india free',
      'carrom coin game online', 'carrom board physics game free',
    ],
    intro: 'The carrom game online in FindurAI is a proper board — striker, nine white and nine black coins, the red queen and four pockets — seen straight from above, the way you would sit over a real board. Press E at the board by the Neon Palace bar, or pick Carrom on the start screen.',
    sections: [
      ['How to play', 'The Striker slider places your striker along the baseline, ◀ ▶ aims, the Power slider sets the flick and Flick sends it. White coins are yours, black are your rival\'s, the queen counts three and must be covered. Pocket all nine to win.'],
      ['Why it feels right', 'Coins slide, bounce off the frame and cannon into each other with real physics; the board is lit flat with no shadows, and the camera never moves while you play.'],
      ['A carrom board in a Kerala-style city', 'FindurAI City is a low-poly city with chai shops, tuk-tuks and a beach — carrom belongs here. Play a frame, then walk out to the dance floor or the pool tables.'],
    ],
    faq: [
      ['Is carrom free to play?', 'Yes, everything in FindurAI is free.'],
      ['Can two real players play carrom together?', 'Right now you play against an AI rival while friends watch beside you; two-player carrom over the network is coming.'],
    ],
  },
  {
    slug: 'ludo-online', start: 'ludo', icon: '🎲',
    title: 'Ludo Online Free — Play Ludo in Your Browser, No Download or Login',
    h1: 'Play Ludo online free — no app, no login',
    description: 'Free Ludo online in the browser: roll, move, capture, home. Play against an explorer in a 3D city, no download and no sign-up. Works on phones.',
    keywords: [
      'ludo online free', 'play ludo online without download', 'ludo game in browser',
      'ludo no login', 'ludo game online for mobile browser', 'free ludo board game online',
      'ludo online multiplayer free', 'ludo game online without app', 'ludo game for android browser',
      'best ludo game online free', 'ludo dice game online free', 'play ludo with friends online free',
      'ludo online no sign up', 'ludo king alternative free browser', 'classic ludo game online',
      'indian board game ludo online', 'how to play ludo online', 'ludo game for pc browser free',
      'ludo game india free', '4 player ludo online free', 'ludo game no app needed',
    ],
    intro: 'Play Ludo online free in FindurAI — a classic four-colour board you open from any explorer\'s card in the 3D city, or straight from the start screen. No app store, no login.',
    sections: [
      ['How it works', 'Roll a six to leave home, move around the board, land on a rival to send them back, bring all four tokens home to win. Your opponent is one of the city\'s explorers; the board opens over the city and closes when you are done.'],
      ['More table games', 'Chess, carrom and real 3D 8-ball are in the same city. Win any of them for points that climb the leaderboard.'],
    ],
    faq: [
      ['Can I play Ludo with a friend?', 'You play against an AI explorer for now; friends can stand beside you in the city and chat while you play.'],
    ],
  },
  {
    slug: 'chess-online', start: 'chess', icon: '♟️',
    title: 'Chess Online Free — Play Chess in Your Browser Without an Account',
    h1: 'Play chess online free — no account needed',
    description: 'Free online chess in the browser with no sign-up: a full board, legal-move rules, against an explorer in a 3D city. Phone and desktop.',
    keywords: ['chess online free no account', 'play chess in browser', 'chess game online without login', 'free chess game to play now', 'chess online for beginners free', 'chess game on mobile browser'],
    intro: 'Play chess online free with no account: FindurAI opens a full chess board from any explorer\'s card in its 3D city, or from the start screen. White moves first — that is you.',
    sections: [
      ['How it works', 'A standard board with legal-move highlighting, check and checkmate detection, against an AI explorer. Win for 300 points on the city leaderboard.'],
      ['Why chess in a city?', 'Because you can play a game, then walk to the beach, race a friend or sit for a coffee with someone you met. FindurAI is a hangout first; the games are what you do there together.'],
    ],
    faq: [
      ['Is there a rating or Elo?', 'Not yet — just points on the leaderboard.'],
    ],
  },
  {
    slug: 'virtual-dating-game', start: 'explore', icon: '💖',
    title: 'Virtual Dating Game Online Free — Meet, Chat and Date in a 3D City',
    h1: 'A free virtual dating game — meet real people in a 3D city',
    description: 'Free virtual dating game in the browser: icebreakers, coffee dates, a Ferris wheel for two, sunset benches, gifts, a boat ride. Meet real people in a 3D city, no download.',
    keywords: ['virtual dating game online free', 'online dating game 3d', 'games to play with girlfriend online long distance', 'virtual world dating free', 'online games for couples to play together', 'virtual hangout game with friends', 'metaverse dating game free', '3d chat world online free'],
    intro: 'FindurAI is a virtual dating game online where the date is a place, not a swipe: a coffee at Chai Corner, a candle-lit table on the sand, the Sunset Wheel, a boat out of the marina, the sunset bench at Lighthouse Point. Real people, one shared 3D city, free in the browser.',
    sections: [
      ['How a date works', 'Walk up to anyone and a card appears: tap an icebreaker — "What brought you to the city?" — and the chat starts. Invite them to a date spot; you both sit down and the city carries on around you. Send a rose, an ice cream, chai, a teddy or a love note; gifts show on their profile.'],
      ['Long-distance couples', 'Two people in different cities load the same URL and meet at the plaza. Ride the Ferris wheel together, take the pirate ship, drive over the Harbour Bridge with one of you on the back of the bike, play carrom at the Palace. It is a shared evening, not a video call.'],
      ['Safe and simple', 'No photos, no real names required, no sign-up. You are a low-poly avatar with the name you chose. Leave any conversation by walking away.'],
    ],
    faq: [
      ['Is it really free?', 'Yes — no subscription, no coins to buy.'],
      ['Can I play with my partner in another country?', 'Yes. The city is one shared world; you both join and meet at the plaza.'],
    ],
  },
  {
    slug: 'kerala-3d-game', start: 'explore', icon: '🌴',
    title: 'Kerala 3D Game Online — Free Malayalam-Style Virtual City in Your Browser',
    h1: 'A Kerala-style 3D city game — free, online, no download',
    description: 'A free Kerala 3D game online: chai shops, tuk-tuks, a beach, a cricket ground and a carrom board in one virtual city. For Little Kerala and Kerala Dhilber fans. No download.',
    keywords: ['kerala 3d game', 'kerala game online', 'malayalam game online free', 'kerala virtual city', 'kerala dhilber', 'kerala dilber game', 'little kerala game', 'games like little kerala', 'kochi 3d game', 'kerala metaverse'],
    intro: 'Looking for a Kerala 3D game online? FindurAI City is a free virtual city built in that spirit — Chai Corner on Café Row, tuk-tuks and bikes, a beach with a pier, a cricket ground, a carrom board at the club and a bridge to an island with a lighthouse. Real people from Kerala and the diaspora meet here.',
    sections: [
      ['For Little Kerala and Kerala Dhilber players', 'If you played Little Kerala (kerala.dhilber.com) and want a bigger city with more to do together, this is it: the same idea of walking and chatting in a shared 3D world, plus cricket, football, a race track, zombie nights, dates and table games.'],
      ['Play with friends abroad', 'Malayalis in the Gulf, the UK or the US load the same link and meet at Downtown Plaza. Evening in Kochi is afternoon in Dubai — the city is always open.'],
      ['What to do first', 'Take a bike from the plaza, ride to Sunset Beach, sit on the pier bench with someone, then head to the cricket ground on Eastside for a one-over match.'],
    ],
    faq: [
      ['Is it in Malayalam?', 'The city is in English for now; chat in whatever language you like.'],
      ['Is it made in Kerala?', 'Yes — built by a solo developer from Kerala.'],
    ],
  },
  {
    slug: 'games-to-play-with-friends-online', start: 'explore', icon: '🤝',
    title: 'Games to Play With Friends Online Free — One 3D City, No Download',
    h1: 'Games to play with friends online — all in one free 3D city',
    description: 'Free games to play with friends online in the browser: cricket, football, racing, zombies, 8-ball, carrom, chess, Ludo — plus a city to hang out in. Phone and PC, no download.',
    keywords: ['games to play with friends online free', 'online games to play with friends on phone', 'multiplayer browser games free', 'free online games with friends no download', 'virtual hangout games', 'games to play on video call with friends', 'browser games for groups'],
    intro: 'Most games to play with friends online are one game each. FindurAI is a city: everyone loads one link, meets at the plaza, and then decides — race to the beach, a one-over cricket match, five-a-side at the stadium, a frame of 8-ball at the Neon Palace, or just a walk and a chat.',
    sections: [
      ['What you can play', 'Cricket (bat and bowl), five-a-side football, a 960 m race with boost pads, zombie night survival, real 3D 8-ball, carrom, chess and Ludo, cash hunts and taxi jobs around the city. Friends see each other in real time, chat, send gifts and ride together on one bike.'],
      ['Good for groups', 'No sign-up means a WhatsApp link is enough to get everyone in. Works on phones with a joystick, so nobody needs a PC.'],
      ['Set a time', 'Zombie night comes on a countdown — meet ten minutes before and hold the bridge together.'],
    ],
    faq: [
      ['How many friends can join?', 'Dozens in the same city at once.'],
      ['Does everyone need the same device?', 'No — phones, tablets and laptops all share the same city.'],
    ],
  },
  {
    slug: 'monopoly', start: 'explore', icon: '🎩',
    title: 'Monopoly Game Online Free — Play Classic Board Game in Browser, No Download (2–4 Players)',
    h1: 'Play Monopoly online free — classic board game in your browser',
    description: 'Free Monopoly board game in the browser: buy properties, build houses and hotels, collect rent, Chance & Community Chest cards. 2–4 players hot-seat. No download, no sign-up. Works on phone and PC.',
    keywords: [
      // core intent
      'monopoly game online free',
      'play monopoly in browser',
      'monopoly no download',
      'monopoly board game online',
      'free monopoly online no sign up',
      // player count
      'monopoly 2 player online free',
      'monopoly 3 player online free',
      'monopoly 4 player online free',
      'monopoly hot seat 2 players',
      'monopoly pass and play online free',
      // device / platform
      'monopoly game for pc browser',
      'monopoly game for mobile browser',
      'monopoly game for android browser',
      'monopoly online no app needed',
      'monopoly game no install',
      'free monopoly game for iphone browser',
      // classic rules
      'classic monopoly game online free',
      'monopoly buy properties online',
      'monopoly build houses and hotels online',
      'monopoly community chest chance cards online',
      'monopoly jail rules online',
      'monopoly bankruptcy game online',
      // how-to intent
      'how to play monopoly online free',
      'how to play monopoly with friends online',
      'monopoly game rules online free',
      // comparison / alternative
      'monopoly go alternative free browser',
      'monopoly king alternative free',
      'best free monopoly game browser',
      'free monopoly game like monopoly go',
      // india / regional
      'monopoly game india free',
      'monopoly game in hindi browser',
      'monopoly game online india no download',
      // social / friends
      'monopoly game with friends browser',
      'monopoly game to play with friends online free',
      'board game online free with friends no download',
    ],
    intro: 'FindurAI has a fully playable free Monopoly game in your browser — no download, no sign-up. Choose 2 to 4 players (hot-seat / pass the device), pick your token (🎩 🚗 🐶 🚢), roll the dice, buy properties from Mediterranean Avenue to Boardwalk, build houses and hotels, draw Chance and Community Chest cards, navigate jail, and outlast every other player.',
    sections: [
      ['Full classic Monopoly rules', 'All 40 squares are here: 22 properties in 8 colour groups (Brown, Light Blue, Pink, Orange, Red, Yellow, Green, Dark Blue), 4 railroads, 2 utilities, Income Tax, Luxury Tax, Community Chest (×3), Chance (×3), Go, Jail, Free Parking and Go To Jail. Roll doubles and go again — roll three in a row and you go straight to jail. Build houses once you own a full colour group; upgrade to a hotel for maximum rent. Mortgage properties when you need cash. Both 16-card decks are fully implemented. The last player standing wins.'],
      ['2 to 4 players, hot-seat', 'Choose 2, 3 or 4 players at the start and pass the device between turns — no second account needed. Each player sees their own money, properties and buildings on screen. Bankrupted players are eliminated; the winner is the last one with money.'],
      ['Premium animated board', 'A dark premium board with gold accents, 3D CSS dice that spin on every roll, smooth token animation that hops square by square, floating +$200 / -$150 money toasts, house and hotel icons on every property you own, a live game log, and a confetti win screen. A 3D mini-city sits in the center of the board and grows as properties get bought.'],
    ],
    faq: [
      ['Is the Monopoly game completely free?', 'Yes — no download, no account, no payment. Just open the page and play.'],
      ['How many players can play?', '2, 3 or 4 players on the same device — pick a number at the start and pass the phone or laptop between turns.'],
      ['Does it follow classic Monopoly rules?', 'Yes — all 40 squares, correct rent tables, houses and hotels, Chance and Community Chest card decks, jail rules, Income Tax, Luxury Tax and bankruptcy all follow the classic Hasbro Monopoly rules.'],
      ['Does it work on mobile?', 'Yes. The board scales down for phones and all controls are tap-friendly.'],
    ],
  },

];

/**
 * Per-game facts for the VideoGame structured data on each landing page. This is what tells a
 * search engine that /play/cricket-game-online/ *is* a cricket game it can offer for "cricket
 * game online", rather than just another page that mentions cricket.
 */
export interface GameMeta { name: string; genre: string[]; playMode: string[]; players: [number, number] }
export const GAME_META: Record<string, GameMeta> = {
  'cricket-game-online':              { name: 'FindurAI Cricket',        genre: ['Sports', 'Cricket'],              playMode: ['SinglePlayer', 'MultiPlayer'], players: [1, 2] },
  'football-game-online':             { name: 'FindurAI Football',       genre: ['Sports', 'Football'],             playMode: ['SinglePlayer', 'MultiPlayer'], players: [1, 10] },
  'zombie-game-online':               { name: 'FindurAI Zombie Night',   genre: ['Survival horror', 'Action'],      playMode: ['SinglePlayer', 'MultiPlayer'], players: [1, 50] },
  'car-racing-game-online':           { name: 'FindurAI Speedway',       genre: ['Racing', 'Driving'],              playMode: ['SinglePlayer', 'MultiPlayer'], players: [1, 4] },
  '8-ball-pool-online':               { name: 'FindurAI 8-Ball Pool',    genre: ['Sports', 'Simulation'],           playMode: ['SinglePlayer', 'MultiPlayer'], players: [1, 2] },
  'carrom-game-online':               { name: 'FindurAI Carrom',         genre: ['Board game', 'Sports'],           playMode: ['SinglePlayer', 'MultiPlayer'], players: [1, 2] },
  'ludo-online':                      { name: 'FindurAI Ludo',           genre: ['Board game', 'Family'],           playMode: ['SinglePlayer', 'MultiPlayer'], players: [2, 4] },
  'chess-online':                     { name: 'FindurAI Chess',          genre: ['Board game', 'Strategy'],         playMode: ['SinglePlayer', 'MultiPlayer'], players: [1, 2] },
  'monopoly':                         { name: 'FindurAI Monopoly',       genre: ['Board game', 'Strategy'],         playMode: ['SinglePlayer'],                players: [1, 4] },
  'virtual-dating-game':              { name: 'FindurAI Dating',         genre: ['Social', 'Simulation'],           playMode: ['MultiPlayer'],                 players: [1, 50] },
  'kerala-3d-game':                   { name: 'FindurAI City',           genre: ['Open world', 'Social'],           playMode: ['MultiPlayer'],                 players: [1, 50] },
  'games-to-play-with-friends-online': { name: 'FindurAI City',          genre: ['Social', 'Party', 'Open world'],  playMode: ['MultiPlayer'],                 players: [2, 50] },
};
export const gameMeta = (slug: string): GameMeta =>
  GAME_META[slug] ?? { name: 'FindurAI City', genre: ['Open world', 'Social'], playMode: ['MultiPlayer'], players: [1, 50] };
