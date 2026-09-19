// Ads inside the city — Google H5 Games Ads (the AdSense "Ad Placement API"). Nothing is ever drawn
// over the 3D canvas: a preroll while the city loads, an interstitial only when a match / race / night
// ends, and rewarded ads the player opts into for a 💎 gift or a zombie-night revive.
// Everything is a no-op until NEXT_PUBLIC_ADSENSE_CLIENT (ca-pub-…) is set.

const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

type Placement = Record<string, unknown>;
interface AdsWindow extends Window { adsbygoogle?: Placement[] }

let ready = false;
let loading: Promise<void> | null = null;
let lastInterstitial = 0;

export const adsEnabled = () => !!CLIENT;
/** True once the SDK has said it is ready — the only time rewarded / interstitial breaks can show. */
export const adsReady = () => ready;

const push = (o: Placement) => { const w = window as AdsWindow; (w.adsbygoogle = w.adsbygoogle || []).push(o); };

/** Load the SDK once (call early; the world calls it at start). Resolves even if ads never come up. */
export function loadAds(): Promise<void> {
  if (!CLIENT || typeof document === 'undefined') return Promise.resolve();
  if (loading) return loading;
  loading = new Promise<void>((resolve) => {
    let done = false; const fin = () => { if (!done) { done = true; resolve(); } };
    const s = document.createElement('script');
    s.async = true; s.crossOrigin = 'anonymous';
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`;
    s.dataset.adFrequencyHint = '180s';                      // at most one interstitial every 3 minutes
    if (process.env.NODE_ENV !== 'production') s.dataset.adbreakTest = 'on';
    s.onload = () => { push({ preloadAdBreaks: 'on', sound: 'on', onReady: () => { ready = true; fin(); } }); setTimeout(fin, 5000); };
    s.onerror = fin;
    document.head.appendChild(s);
  });
  return loading;
}

/** While the city loads: one preroll, then `done` (always called — with a timeout if the ad never shows). */
export function preroll(done: () => void) {
  if (!CLIENT) { done(); return; }
  let called = false; const fin = () => { if (!called) { called = true; done(); } };
  loadAds().then(() => { if (!ready) return fin(); push({ type: 'preroll', name: 'city-load', adBreakDone: fin }); setTimeout(fin, 12000); });
}

/** A natural break — match over, race finished, dawn after zombie night. The SDK frequency-caps it. */
export function interstitial(name: string) {
  if (!CLIENT || !ready) return;
  if (Date.now() - lastInterstitial < 150000) return;   // our own cap on top of Google's
  lastInterstitial = Date.now();
  push({ type: 'next', name, adBreakDone: () => {} });
}

/** Opt-in rewarded ad. `onReward` only after the whole ad was watched; `onUnavailable` when there is none. */
export function rewarded(name: string, onReward: () => void, onUnavailable: () => void) {
  if (!CLIENT || !ready) { onUnavailable(); return; }
  let offered = false, rewardedNow = false;
  push({
    type: 'reward', name,
    beforeReward: (showAdFn: () => void) => { offered = true; showAdFn(); },
    adViewed: () => { rewardedNow = true; onReward(); },
    adDismissed: () => {},
    adBreakDone: () => { if (!offered && !rewardedNow) onUnavailable(); },
  });
}
