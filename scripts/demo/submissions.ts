/**
 * Demo submissions: fictional campaigns that exercise every status.
 * Each step is a point in time (days/hours ago) so the dashboard and audit log
 * look like a few weeks of real use.
 */
import type { Channel, ReviewDecision } from "../../src/lib/types";

export type Step =
  | { type: "version"; at: number; text: string; url?: string; image?: string; note?: string }
  | { type: "check"; at: number }
  | { type: "submit"; at: number }
  | { type: "open"; at: number }
  | { type: "review"; at: number; decision: Exclude<ReviewDecision, "comment">; comment: string }
  | { type: "comment"; at: number; by: "marketing" | "compliance"; comment: string };

export type DemoSubmission = {
  campaign: string;
  brand: "NovaBet" | "Orbit Casino";
  jurisdiction: "UK" | "SE" | "NL";
  channel: Channel;
  notes?: string;
  createdAt: number; // hours ago
  steps: Step[];
};

const D = 24; // hours per day

export const DEMO_SUBMISSIONS: DemoSubmission[] = [
  {
    campaign: "Autumn Football Weekend",
    brand: "NovaBet",
    jurisdiction: "UK",
    channel: "social_media",
    notes: "Paid social, carousel format. Goes live Friday.",
    createdAt: 4 * D,
    steps: [
      { type: "version", at: 4 * D, image: "novabet-football-v1.png", text: "NovaBet Weekend Football Specials. Risk-free bets on the biggest matches. Act now, last chance!" },
      { type: "check", at: 4 * D - 0.2 },
      { type: "submit", at: 4 * D - 0.3 },
      { type: "open", at: 3 * D + 20 },
      { type: "review", at: 3 * D + 19, decision: "changes_requested", comment: "Remove “risk-free” and the urgency wording. Add the 18+ notice, a safer gambling message and a terms reference." },
      { type: "version", at: 3 * D, image: "novabet-football-v1.png", note: "Removed risk-free and urgency wording", url: "https://novabet.example.com/football", text: "NovaBet Weekend Football Specials. Odds boosts on the biggest matches.\n18+ | T&Cs apply" },
      { type: "check", at: 3 * D - 0.1 },
      { type: "submit", at: 3 * D - 0.2 },
      { type: "open", at: 2 * D + 6 },
      { type: "review", at: 2 * D + 5, decision: "changes_requested", comment: "Safer gambling message is still missing, and the image does not show the 18+ notice." },
      { type: "comment", at: 2 * D + 2, by: "marketing", comment: "Updated the banner artwork with the full footer." },
      { type: "version", at: 2 * D, image: "novabet-football-v2.png", note: "Added safer gambling message to copy and banner", url: "https://novabet.example.com/football", text: "NovaBet Weekend Football Specials. Odds boosts on selected matches.\n18+ | Please gamble responsibly | T&Cs apply" },
      { type: "check", at: 2 * D - 0.1 },
      { type: "submit", at: 2 * D - 0.2 },
      { type: "open", at: D + 3 },
      { type: "review", at: D + 2, decision: "approved", comment: "Approved for UK paid social. Banner footer verified manually." },
    ],
  },
  {
    campaign: "Autumn Slots Collection",
    brand: "Orbit Casino",
    jurisdiction: "UK",
    channel: "display_advertising",
    createdAt: 3 * D,
    steps: [
      { type: "version", at: 3 * D, image: "orbit-casino-autumn.png", url: "https://orbitcasino.example.com/autumn", text: "Orbit Casino Autumn Slots Collection. New titles every week.\n18+ | Please gamble responsibly | T&Cs apply" },
      { type: "check", at: 3 * D - 0.1 },
      { type: "submit", at: 3 * D - 0.2 },
      { type: "open", at: 2 * D + 1 },
      { type: "review", at: 2 * D, decision: "approved", comment: "Approved. Image footer matches copy." },
    ],
  },
  {
    campaign: "Höstens nyheter",
    brand: "Orbit Casino",
    jurisdiction: "SE",
    channel: "display_advertising",
    notes: "Swedish display campaign, programmatic.",
    createdAt: 30 * D,
    steps: [
      { type: "version", at: 30 * D, image: "orbit-casino-sweden.png", url: "https://orbitcasino.example.com/se/nyheter", text: "Orbit Casino: Nya spel i höst. Upptäck veckans nyheter.\n18+ | Spela ansvarsfullt | Regler och villkor gäller" },
      { type: "check", at: 30 * D - 0.1 },
      { type: "submit", at: 30 * D - 0.2 },
      { type: "open", at: 29 * D },
      { type: "review", at: 29 * D - 1, decision: "approved", comment: "Approved for Sweden display." },
    ],
  },
  {
    campaign: "Tennis Finals Week",
    brand: "NovaBet",
    jurisdiction: "UK",
    channel: "email",
    createdAt: 10,
    steps: [
      { type: "version", at: 10, image: "novabet-tennis.png", url: "https://novabet.example.com/tennis", text: "Subject: Tennis Finals Week at NovaBet\nLive markets on every match, with the best odds in town.\n18+ | Take time to think | T&Cs apply" },
      { type: "check", at: 9.8 },
      { type: "submit", at: 9.7 },
    ],
  },
  {
    campaign: "Voetbal nieuwsbrief oktober",
    brand: "NovaBet",
    jurisdiction: "NL",
    channel: "email",
    createdAt: 6,
    steps: [
      { type: "version", at: 6, url: "https://novabet.example.com/nl/voetbal", text: "NovaBet nieuwsbrief: alle wedstrijden van het weekend op een rij.\n18+ | Speel bewust" },
      { type: "check", at: 5.9 },
      { type: "submit", at: 5.8 },
    ],
  },
  {
    campaign: "Win-back SMS",
    brand: "Orbit Casino",
    jurisdiction: "SE",
    channel: "sms",
    createdAt: 2 * D,
    steps: [
      { type: "version", at: 2 * D, text: "Orbit Casino: we miss you! Hurry back for a surprise. 18+" },
      { type: "check", at: 2 * D - 0.1 },
      { type: "submit", at: 2 * D - 0.2 },
      { type: "open", at: D + 8 },
      { type: "review", at: D + 7, decision: "changes_requested", comment: "Add the responsible play message and the terms reference. Remove “Hurry”." },
    ],
  },
  {
    campaign: "Affiliate Banner: Big Match",
    brand: "NovaBet",
    jurisdiction: "UK",
    channel: "affiliate_creative",
    notes: "Supplied by affiliate partner.",
    createdAt: 6 * D,
    steps: [
      { type: "version", at: 6 * D, url: "https://partner.example.com/novabet", text: "Guaranteed winnings with NovaBet! Easy money for students this weekend. 18+" },
      { type: "check", at: 6 * D - 0.1 },
      { type: "submit", at: 6 * D - 0.2 },
      { type: "open", at: 5 * D },
      { type: "review", at: 5 * D - 1, decision: "rejected", comment: "Rejected: guaranteed-outcome and financial wording, and a reference to students. Affiliate must not use this creative." },
    ],
  },
  {
    campaign: "Champions Night Landing Page",
    brand: "NovaBet",
    jurisdiction: "NL",
    channel: "landing_page",
    notes: "Draft copy, still waiting for legal footer from the NL team.",
    createdAt: 3,
    steps: [{ type: "version", at: 3, url: "https://novabet.example.com/nl/champions", text: "NovaBet Champions Night: live statistieken en wedstrijdverslagen." }],
  },
  {
    campaign: "Live Casino Welcome Email",
    brand: "Orbit Casino",
    jurisdiction: "UK",
    channel: "email",
    createdAt: 20,
    steps: [
      { type: "version", at: 20, url: "https://orbitcasino.example.com/live", text: "Subject: Your Orbit Casino live tables\nDiscover live dealer tables at Orbit Casino.\n18+ | Please gamble responsibly | T&Cs apply" },
      { type: "check", at: 19.9 },
    ],
  },
  {
    campaign: "Cup Weekend Display",
    brand: "NovaBet",
    jurisdiction: "UK",
    channel: "display_advertising",
    createdAt: 2 * D,
    steps: [
      { type: "version", at: 2 * D, url: "https://novabet.example.com/cup", text: "NovaBet Cup Weekend. Every match, every market. Don't miss out!\n18+" },
      { type: "check", at: 2 * D - 0.1 },
      { type: "submit", at: 2 * D - 0.2 },
      { type: "open", at: D + 4 },
      { type: "review", at: D + 3, decision: "changes_requested", comment: "Remove “Don't miss out”. Add safer gambling message and terms reference." },
      { type: "version", at: 12, note: "Removed urgency wording, added messages", url: "https://novabet.example.com/cup", text: "NovaBet Cup Weekend. Every match, every market.\n18+ | Please gamble responsibly | T&Cs apply" },
      { type: "check", at: 11.9 },
      { type: "submit", at: 11.8 },
    ],
  },
];
