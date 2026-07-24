import type { Metadata } from "next";
import { ConferenceExperience } from "./conference-experience";

export const metadata: Metadata = {
  title: "Velocity Venue — Live Video Conferences",
  description:
    "A resilient virtual conference venue and producer command center.",
};

export default async function Home() {
  return <ConferenceExperience />;
}
