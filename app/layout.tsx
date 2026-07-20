import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const origin = `${protocol}://${host}`;
  const description = "A resilient virtual conference venue and producer command center.";

  return {
    metadataBase: new URL(origin),
    title: "Velocity Venue",
    description,
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "Velocity Venue",
      description,
      type: "website",
      images: [{ url: `${origin}/og.png`, width: 1732, height: 908, alt: "Velocity Venue — Your event, in motion." }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Velocity Venue",
      description,
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
