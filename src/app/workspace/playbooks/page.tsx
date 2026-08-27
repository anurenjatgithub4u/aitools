import { redirect } from "next/navigation"

// Old route — now lives at /packs (Product Pivot spec §4)
export default function PlaybooksPage() {
  redirect("/packs")
}
