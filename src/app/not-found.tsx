import Link from "next/link";

export default function NotFound() {
  return (
    <div className="landing">
      <section className="hero">
        <p className="eyebrow">Off the map</p>
        <h1>That world doesn&apos;t exist yet.</h1>
        <p className="lede">
          <Link href="/">← Back to all worlds</Link>
        </p>
      </section>
    </div>
  );
}
