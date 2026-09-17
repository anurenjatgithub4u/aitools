// Shared SEO strings: keep the title, description, keywords and site URL in one place.
export const SITE = "https://www.findurai.com";
export const SITE_NAME = "FindurAI";
export const TAGLINE = "FindurAI · Free 3D city game in your browser — hang out, date, race, cricket, football, zombies";
export const DESCRIPTION =
  "FindurAI is a free multiplayer 3D city (a browser metaverse) — no download, works on phone and desktop. Meet real friends and virtual dates at the plaza, bar-hop on Neon Lane, chill at Sunset Beach, drive jeeps, tuk-tuks and bikes across the Harbour Bridge, race a 960 m speedway with boost pads, play 5-a-side football, bat and bowl cricket, survive zombie night, hunt hidden cash and play chess, Ludo, carrom and 8-ball pool together. If you loved Little Kerala (kerala.dhilber.com), this is your next city.";

export const KEYWORDS = [
  // what it is
  "FindurAI", "findurai game", "free browser game", "3D open world game online", "no download game", "metaverse in browser", "browser metaverse game",
  "virtual city game", "virtual world to hang out with friends", "online hangout game", "virtual dating game", "meet friends online 3D",
  "multiplayer city game", "social game online free", "low poly city game", "play in browser mobile game", "3D game for phone browser",
  // kerala / dhilber searches
  "kerala dilber", "kerala dhilber", "dilber kerala game", "little kerala", "little kerala game", "little kerala online", "kerala game",
  "kerala 3d game online", "kerala metaverse", "kerala virtual city", "kerala.dhilber.com alternative", "games like little kerala",
  "malayalam game online", "kerala online game free",
  // games inside the city
  "football game online free", "5 a side football browser game", "cricket game online free", "cricket batting bowling game browser",
  "zombie survival game browser", "zombie game online no download", "car racing game online", "tuk-tuk driving game", "jeep driving game",
  "treasure hunt game", "cash hunt game", "chess online free", "ludo online", "carrom online", "8 ball pool online",
  // places
  "virtual beach hangout", "virtual bar pub club online", "virtual stadium football", "virtual cricket ground",
];

export const FEATURES = {
  places: [
    ["Downtown Plaza", "fountain, big screen and the spawn point — where everyone meets"],
    ["Café Row & Food-truck Park", "Chai Corner, Waffle Wonders, taco and biryani trucks"],
    ["Neon Lane", "Tipsy Turtle Pub, Whiskey & Wings, Bass Drop Club, Karaoke Kingdom, Skyline Rooftop Bar, Mojito Shack"],
    ["Sunset Beach", "sand, shacks, volleyball net, a pier, boats and a lifeguard tower"],
    ["Central Park", "a lake, benches and a bandstand"],
    ["City Stadium", "a full 56 × 36 m football pitch with goals, stands and floodlights"],
    ["Sunrise High School & FindurAI College", "playground, court and a library"],
    ["Starlight Cinema, City Mall, Skate Park, Palm Grove Homes", "the rest of the city to explore"],
    ["Harbour Bridge", "a suspension bridge over the strait to Eastside"],
    ["Eastside island", "Harbour Town and marina, Windmill Hill, Lakeside Camp on Mirror Lake, Sunny Orchard, Lighthouse Point"],
    ["FindurAI Cricket Ground", "oval, strip, pavilion and scoreboard on Eastside"],
    ["FindurAI Speedway", "a 960 m circuit: pit straight, Sunset sweeper, Neon chicane, the Valley run, Big Bend and the Esses"],
  ],
  games: [
    ["🏁 Speedway race", "1–5 laps against three rivals, green boost pads and Shift nitro"],
    ["⚽ Football", "five-a-side at City Stadium: dribble, shoot, keepers and passing AI"],
    ["🏏 Cricket", "two innings — bat with timing, then bowl with a release meter; pick 1–5 overs"],
    ["🧟 Zombie night", "waves of walkers, runners, crawlers, hoppers, bloaters and brutes — punch or drive through them"],
    ["💰 Cash hunt, checkpoint dash, taxi job, snack run", "timed tasks around the city"],
    ["🎱 8-ball pool, ♟️ chess, 🎲 Ludo, 🎯 carrom", "table games against any explorer"],
  ],
  social: [
    ["Real-time multiplayer", "see real people walk, drive and chat; friend requests and a friends list"],
    ["Hang out & date", "walk together, chat, sit at the beach or the rooftop bar"],
    ["Your explorer", "pick a name and a male or female avatar; rank on the leaderboard"],
    ["Phone & desktop", "joystick and buttons on mobile, WASD on desktop, no install"],
  ],
} as const;
