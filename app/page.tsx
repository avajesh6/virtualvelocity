import type { Metadata } from "next";
import { ConferenceExperience } from "./conference-experience";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Velocity Venue — Global Innovation Summit",
  description:
    "A resilient virtual conference venue and producer command center by Virtual Velocity.",
};

export default async function Home() {
  return <ConferenceExperience />;
}
