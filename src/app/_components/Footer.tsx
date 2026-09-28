import Link from "next/link";

export function Footer() {
  return (
    <footer className="site-footer">
      <p>
        © {new Date().getFullYear()} FindurAI &nbsp;·&nbsp;
        <Link href="/privacy-policy/">Privacy Policy</Link> &nbsp;·&nbsp;
        <Link href="/terms/">Terms of Service</Link> &nbsp;·&nbsp;
        <Link href="/about/">About</Link> &nbsp;·&nbsp;
        <Link href="/games/">Games</Link>
      </p>
      <p className="site-footer-note">
        FindurAI is a free entertainment platform. All in-game currency and rewards are purely virtual —
        nothing here is real money, and nothing can be redeemed for it.
      </p>
    </footer>
  );
}
