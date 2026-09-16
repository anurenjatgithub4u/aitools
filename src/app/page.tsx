import { CITY } from "@/world/destinations";
import { WorldView } from "./world/[id]/world-view";

// The home page *is* the city: no landing screen, straight into the world.
export default function Home() {
  return <WorldView id={CITY.id} />;
}
