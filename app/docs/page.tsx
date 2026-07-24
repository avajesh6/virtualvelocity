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
} from "lucide-react";

export const metadata: Metadata = {
  title: "Documentation — Velocity Venue",
  description: "Product, operator, integration, and troubleshooting documentation for Velocity Venue.",
};

const capabilities = [
  {
    icon: Users,
    title: "Attendee venue",
    text: "Move between stage, studio, expo, and networking spaces; join secure LiveKit rooms; use chat and device controls; and capture expo interest.",
  },
  {
    icon: Radio,
    title: "Producer command",
    text: "Monitor live participants, mute or remove disruptive attendees, advance the run of show, send cues, and coordinate external channels.",
  },
  {
    icon: ShieldCheck,
    title: "Rescue Mode",
    text: "Create a backup LiveKit room, move active participants, preserve the event shell, and record the incident and recovery result.",
  },
  {
    icon: Database,
    title: "Durable operations",
    text: "Store leads, incidents, audit events, and run-of-show state in Cloudflare D1 so operational history survives reloads and deployments.",
  },
];

const workflows = [
  ["Join an event", "Choose a venue space, select Join live room, confirm your display name and device state, then enter the room."],
  ["Open producer mode", "Sign in with an authorized Supabase account. Producer access requires an app role or an address on the producer allowlist."],
  ["Advance the show", "Select the next run-of-show item. The chosen item becomes live, preceding items become complete, and the change is written to D1."],
  ["Handle a disruption", "Activate Rescue Mode from Main Stage. Velocity Venue creates a backup room, moves participants, and writes an incident and audit entry."],
  ["Send an announcement", "The producer announcement action dispatches to configured Slack and Teams adapters and records the delivery outcome."],
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

      <section className="docs-section docs-two-column" id="integrations">
        <div>
          <div className="docs-section-title"><span>03</span><div><small>CONNECTED SERVICES</small><h2>Integration behavior</h2></div></div>
          <div className="docs-copy">
            <h3>LiveKit</h3>
            <p>Provides real-time audio, video, screen sharing, chat, participant administration, and room recovery. Browser clients receive short-lived room tokens; API credentials remain server-side.</p>
            <h3>Supabase</h3>
            <p>Authenticates producer accounts. Authorization is enforced again on every protected server endpoint, independent of what the interface displays.</p>
            <h3>Cloudflare D1</h3>
            <p>Persists operational records. The venue continues with clearly labelled demo data when a local preview has no database binding.</p>
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
        <div className="docs-section-title"><span>04</span><div><small>OPERATIONS</small><h2>Failure and recovery</h2></div></div>
        <div className="docs-status-grid">
          <article><HeartPulse size={19} /><div><h3>LiveKit unavailable</h3><p>Attendees remain inside the venue shell and receive a clear availability message. Producer controls display demo status.</p></div></article>
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
