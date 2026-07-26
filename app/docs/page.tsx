import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Database,
  HeartPulse,
  Radio,
  ShieldCheck,
  Users,
  Workflow,
  Sparkles,
  Captions,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Documentation — Velocity Venue",
  description: "Product, operator, integration, and troubleshooting documentation for Velocity Venue.",
};

const capabilities = [
  {
    icon: Users,
    title: "Attendee venue",
    text: "Move between stage, studio, expo, and networking spaces; preview devices; join secure LiveKit or Agora rooms; share a screen; chat; and capture expo interest.",
  },
  {
    icon: Radio,
    title: "Producer command",
    text: "Monitor live participants, mute or remove disruptive attendees, publish and advance the run of show, send announcements, and resolve attendee support requests.",
  },
  {
    icon: ShieldCheck,
    title: "Rescue Mode",
    text: "Create a backup LiveKit room, move active participants, preserve the event shell, and record the incident and recovery result.",
  },
  {
    icon: Database,
    title: "Durable operations",
    text: "Store support requests, engagement, networking consent, telemetry, transcripts, recordings, incidents, and run-of-show state in Cloudflare D1.",
  },
  {
    icon: Sparkles,
    title: "Venue intelligence",
    text: "Turn verified LiveKit events into attendance history, producer recommendations, ranked Q&A, recording controls, and sponsor analytics.",
  },
  {
    icon: Captions,
    title: "Conference memory",
    text: "Display LiveKit transcription streams, search finalized captions, publish replays, and generate summaries and chapters after each session.",
  },
];

const workflows = [
  ["Join an event", "Choose a venue space, select Join live room, choose LiveKit or a configured Agora provider, preview your devices, then enter the room."],
  ["Run a video conference", "Use the participant grid, pin speakers, share your screen, exchange live chat messages, copy an invite link, and monitor connection status from the conference header."],
  ["Choose an appearance", "Use the sun or moon control to switch between light and dark modes. Velocity Venue remembers the preference on this device."],
  ["Choose a data mode", "Live mode uses LiveKit and D1 only. Demo mode is clearly labelled and uses isolated sample data without changing live systems."],
  ["Open producer mode", "Sign in with an authorized Supabase account. Producer access requires an app role or an address on the producer allowlist."],
  ["Advance the show", "Select the next run-of-show item. The chosen item becomes live, preceding items become complete, and the change is written to D1."],
  ["Handle a disruption", "Activate Rescue Mode from Main Stage. Velocity Venue creates a backup room, moves participants, and writes an incident and audit entry."],
  ["Send an announcement", "The producer announcement action dispatches to configured Slack and Teams adapters and records the delivery outcome."],
  ["Engage with a session", "Sign in to answer live polls, upvote questions, send reactions, raise your hand, or add a question to the moderator queue."],
  ["Build your network", "Create an opt-in interest profile. Only discoverable attendees appear in suggestions, and sponsor contact details are shared only after explicit consent."],
  ["Record and remember", "A producer can start LiveKit Egress, publish a replay, import finalized transcript segments, and generate a searchable conference memory."],
];

export default function DocumentationPage() {
  return (
    <main className="docs-shell">
      <header className="docs-header">
        <Link href="/" className="docs-back"><ArrowLeft size={16} />Back to venue</Link>
        <div className="docs-brand"><span className="brand-mark"><i /><i /></span>VELOCITY <strong>VENUE</strong></div>
        <span className="docs-version">PRODUCT GUIDE</span>
      </header>

      <section className="docs-hero">
        <div>
          <span className="docs-kicker"><BookOpen size={14} />DOCUMENTATION</span>
          <h1>Operate the venue with confidence.</h1>
          <p>
            This guide explains what Velocity Venue does, how attendee and producer
            workflows behave, and what to check when an external service is unavailable.
          </p>
        </div>
        <nav className="docs-toc" aria-label="Documentation sections">
          <a href="#capabilities">Capabilities</a>
          <a href="#workflows">Workflows</a>
          <a href="#demo">Demo walkthrough</a>
          <a href="#integrations">Integrations</a>
          <a href="#resilience">Resilience</a>
        </nav>
      </section>

      <section className="docs-section" id="capabilities">
        <div className="docs-section-title"><span>01</span><div><small>PRODUCT MAP</small><h2>Core capabilities</h2></div></div>
        <div className="docs-card-grid">
          {capabilities.map(({ icon: Icon, title, text }) => (
            <article className="docs-card" key={title}>
              <Icon size={21} />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="docs-section" id="workflows">
        <div className="docs-section-title"><span>02</span><div><small>QUICK START</small><h2>Primary workflows</h2></div></div>
        <div className="docs-workflows">
          {workflows.map(([title, text], index) => (
            <article key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div><h3>{title}</h3><p>{text}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="docs-section" id="demo">
        <div className="docs-section-title"><span>03</span><div><small>SAFE PRODUCT TOUR</small><h2>Demo walkthrough</h2></div></div>
        <div className="docs-copy">
          <p>Select <strong>Demo</strong> in the venue header. The cyan “DEMO DATA · NO LIVE IMPACT” label confirms that the browser is using an isolated sample workspace.</p>
          <ol>
            <li>Open Main Stage and try mute, camera, captions, and screen-share controls in the simulated room. Demo never requests device permission or contacts a media provider.</li>
            <li>Answer the poll, upvote or submit a question, edit the opt-in profile, accept a connection, schedule an introduction, and export the conference capsule.</li>
            <li>Select <strong>Producer demo</strong> without signing in. Explore room health, the run of show, Rescue Mode, recording, poll, transcript, replay, sponsor, and conference-memory controls.</li>
            <li>Switch back to Live. Any open demo media surface closes, local demo changes are discarded, and protected producer actions require authorization.</li>
          </ol>
          <p>Sample names, counts, messages, and leads are illustrative. They are never written to D1, sent to a CRM, or attributed to a real attendee.</p>
        </div>
      </section>

      <section className="docs-section docs-two-column" id="integrations">
        <div>
          <div className="docs-section-title"><span>04</span><div><small>CONNECTED SERVICES</small><h2>Integration behavior</h2></div></div>
          <div className="docs-copy">
            <h3>LiveKit</h3>
            <p>Provides device preview, real-time media, captions, participant administration, signed event webhooks, room recovery, recording, and streaming. Browser clients receive short-lived room tokens; API credentials remain server-side.</p>
            <h3>Agora</h3>
            <p>Provides an attendee-selectable alternative media path when configured. The server validates the venue-room allowlist and issues short-lived channel tokens; Demo mode never requests one.</p>
            <h3>Caption translation</h3>
            <p>Finalized LiveKit captions can be sent to an approved private translation webhook. The interface labels unavailable translation clearly and never presents untranslated text as translated output.</p>
            <h3>Supabase</h3>
            <p>Authenticates accounts with Google OAuth or email/password. Authorization is enforced again on every protected server endpoint, independent of the sign-in method or what the interface displays.</p>
            <h3>Cloudflare D1</h3>
            <p>Persists operational records, engagement, attendee preferences, consent, telemetry, transcripts, and content metadata. Live mode never substitutes demo records.</p>
            <h3>Recording and conference memory</h3>
            <p>LiveKit Egress writes to configured S3-compatible or RTMP destinations. Transcript summaries stay local unless the operator explicitly configures an approved private generation service.</p>
            <h3>Calendar, Slack, Teams, and CRM</h3>
            <p>Webhook adapters remain inactive until their production URLs are configured. Missing adapters return an explicit “not configured” result instead of silently claiming delivery.</p>
          </div>
        </div>
        <aside className="docs-flow" aria-label="System request flow">
          <Workflow size={22} />
          <strong>Request flow</strong>
          <ol>
            <li><span>1</span>Browser requests a protected action</li>
            <li><span>2</span>Server validates the Supabase bearer token</li>
            <li><span>3</span>Role authorization checks producer access</li>
            <li><span>4</span>LiveKit, D1, or an adapter performs the action</li>
            <li><span>5</span>An audit record captures the outcome</li>
          </ol>
        </aside>
      </section>

      <section className="docs-section" id="resilience">
        <div className="docs-section-title"><span>05</span><div><small>OPERATIONS</small><h2>Failure and recovery</h2></div></div>
        <div className="docs-status-grid">
          <article><HeartPulse size={19} /><div><h3>LiveKit unavailable</h3><p>Attendees remain inside the venue shell and receive a clear availability message. Live mode never displays fabricated room counts.</p></div></article>
          <article><Database size={19} /><div><h3>D1 unavailable</h3><p>Live media administration continues. Persistence endpoints return a service-unavailable response so the interface never reports a false save.</p></div></article>
          <article><ShieldCheck size={19} /><div><h3>Integration unavailable</h3><p>The adapter reports whether it is unconfigured or failed. The operational record captures delivery state when D1 is available.</p></div></article>
        </div>
      </section>

      <footer className="docs-footer">
        <span>VELOCITY VENUE</span>
        <p>For deployment, API, schema, and maintenance details, see the repository documentation.</p>
        <Link href="/">Return to the live venue</Link>
      </footer>
    </main>
  );
}
