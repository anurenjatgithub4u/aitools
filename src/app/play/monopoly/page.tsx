import type { Metadata } from 'next';
import { SITE, SITE_NAME } from '../../seo';
import MonopolyGame from './MonopolyGame';

export const metadata: Metadata = {
  title: { absolute: 'Monopoly Game Online Free — Play in Browser vs 3 Computer Players, No Download' },
  description: 'Play free Monopoly in your browser: buy countries, build houses, collect rent, survive jail and bankrupt your rivals. Classic rules, four players — you against three computer explorers. No download, no sign-up.',
  keywords: [
    'monopoly game online free', 'play monopoly in browser', 'monopoly no download', 'monopoly board game online',
    'free monopoly online no sign up', 'monopoly 4 player online free', 'monopoly vs computer online free', 'monopoly with countries online',
    'classic board game online free', 'monopoly game for pc browser', 'monopoly game for mobile browser',
    'online monopoly no app', 'monopoly buy properties online', 'best free monopoly game browser',
  ],
  alternates: { canonical: '/play/monopoly/' },
  openGraph: {
    title: 'Monopoly Game Online Free — Play in Browser',
    description: 'Free classic Monopoly in your browser: buy countries, build hotels, collect rent. You against three computer players, no download.',
    url: `${SITE}/play/monopoly/`,
    type: 'website',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': `${SITE}/play/monopoly/#page`,
      url: `${SITE}/play/monopoly/`,
      name: 'Monopoly Game Online Free',
      description: 'Free classic Monopoly board game playable in your browser.',
      isPartOf: { '@id': `${SITE}/#website` },
      mainEntity: { '@id': `${SITE}/play/monopoly/#game` },
    },
    {
      '@type': 'VideoGame',
      '@id': `${SITE}/play/monopoly/#game`,
      name: 'FindurAI Monopoly',
      url: `${SITE}/play/monopoly/`,
      description: 'A free browser Monopoly: a world-tour board of countries, four players (you against three computer explorers), houses, hotels, rent, Chance and Community Chest.',
      applicationCategory: 'GameApplication',
      operatingSystem: 'Any (web browser)',
      gamePlatform: ['Web browser', 'Android', 'iOS', 'Windows', 'macOS'],
      genre: ['Board game', 'Strategy'],
      playMode: 'SinglePlayer',
      numberOfPlayers: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 4 },
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR', availability: 'https://schema.org/InStock', url: `${SITE}/play/monopoly/` },
      inLanguage: 'en',
      image: `${SITE}/play/monopoly/opengraph-image`,
      author: { '@id': `${SITE}/#org` },
      publisher: { '@id': `${SITE}/#org` },
      isPartOf: { '@id': `${SITE}/#game` },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: SITE_NAME, item: SITE },
        { '@type': 'ListItem', position: 2, name: 'Games', item: `${SITE}/games/` },
        { '@type': 'ListItem', position: 3, name: 'Monopoly', item: `${SITE}/play/monopoly/` },
      ],
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: 'Is Monopoly free to play?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. It is completely free with no download or sign-up required.' } },
        { '@type': 'Question', name: 'How many players can play?', acceptedAnswer: { '@type': 'Answer', text: 'Four: you plus three computer explorers, so a game starts straight away with nobody else needed.' } },
        { '@type': 'Question', name: 'Does it follow real Monopoly rules?', acceptedAnswer: { '@type': 'Answer', text: 'Yes — classic rules including dice rolling, buying properties, building houses and hotels, collecting rent, Chance and Community Chest cards, jail, taxes, and bankruptcy.' } },
      ],
    },
  ],
};

export default function MonopolyPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <MonopolyGame />
    </>
  );
}
