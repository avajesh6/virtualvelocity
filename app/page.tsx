import type { Metadata } from "next";
import { chatGPTSignInPath, chatGPTSignOutPath, getChatGPTUser } from "./chatgpt-auth";
import { ConferenceExperience } from "./conference-experience";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Velocity Venue — Global Innovation Summit",
  description:
    "A resilient virtual conference venue and producer command center by Virtual Velocity.",
};

export default async function Home() {
  const user = await getChatGPTUser();
  return (
    <ConferenceExperience
      producerUser={user ? { displayName: user.displayName, email: user.email } : null}
      producerSignInPath={chatGPTSignInPath("/?role=producer")}
      producerSignOutPath={chatGPTSignOutPath("/")}
    />
  );
}
