import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "../_components/Site";
import { Pricing } from "./Pricing";

export const metadata: Metadata = { title: "Pricing — FindUrAI" };

export default function PricingPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-16">
        <Pricing />
      </main>
      <SiteFooter />
    </>
  );
}
