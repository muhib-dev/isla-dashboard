import { SIZE_BAND_LABELS, type PeerFilter } from "@/features/analytics/schema";
import { REGION_LABELS } from "@/features/schools/schema";

/** "Compared with 46 peer schools · Midwest · 200–499 students" */
export function describePeers(peerCount: number, peers: PeerFilter) {
  const region =
    peers.region === "all" ? "All regions" : REGION_LABELS[peers.region];
  const size = SIZE_BAND_LABELS[peers.size];
  if (peerCount === 0) return `No peer schools match · ${region} · ${size}`;
  return `Compared with ${peerCount} peer ${peerCount === 1 ? "school" : "schools"} · ${region} · ${size}`;
}
