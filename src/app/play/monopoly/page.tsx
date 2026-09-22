import type { Metadata } from 'next';
import { SITE, SITE_NAME } from '../../seo';
import MonopolyGame from './MonopolyGame';

export const metadata: Metadata = {
  title: { absolute: 'Monopoly Game Online Free — Play in Browser, No Download (2–4 Players)' },
  description: 'Play free Monopoly in your browser: buy properties, build houses, collect rent, survive jail and bankrupt your rivals. Classic board game rules, 2–4 players hot-seat, no download, no sign-up.',
  keywords: [
    'monopoly game online free', 'play monopoly in browser', 'monopoly no download', 'monopoly board game online',
    'free monopoly online no sign up', 'monopoly 2 player online free', 'monopoly 4 player online free',
    'classic board game online free', 'monopoly game for pc browser', 'monopoly game for mobile browser',
    'online monopoly no app', 'monopoly buy properties online', 'best free monopoly game browser',
  ],
  alternates: { canonical: '/play/monopoly/' },
  openGraph: {
    title: 'Monopoly Game Online Free — Play in Browser',
    description: 'Free classic Monopoly in your browser: buy properties, build hotels, collect rent. 2–4 players, no download.',
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
        { '@type': 'Question', name: 'How many players can play?', acceptedAnswer: { '@type': 'Answer', text: '2 to 4 players can play hot-seat (passing the device between turns).' } },
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
