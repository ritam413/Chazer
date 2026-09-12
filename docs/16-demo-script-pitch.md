# 16 — Demo Script & Pitch

> **Chazer** · 5-Minute Hackathon Demo Script

---

## Setup Before Recording

**Screen layout:**
- Browser: Dashboard at `https://chazer.vercel.app/dashboard`
- Terminal: hidden but ready with `python -m agent.main` command
- Browser tab 2: Audit Log page (pre-opened)
- Database state: Fresh seed (8 invoices, no prior contact history)

**Check:**
- [ ] All 8 invoices visible in dashboard
- [ ] Decision queue has 0 items (starting clean)
- [ ] Audit log is empty (starting clean)
- [ ] Gemini API key working (test classification locally)
- [ ] Resend sandbox active (no real emails during recording)

---

## Minute-by-Minute Script

---

### 0:00 – 0:30 | Hook

**[Screen: Dashboard — Aging Receivables view]**

**Say:**
> "This is $83,000 of work that's already been delivered — and hasn't been paid for."

**[Pause 2 seconds. Let the numbers land.]**

> "Every one of these clients owes money. Some for 7 days, some for 43. And the person who did this work has been quietly hoping they'll pay, because following up feels awkward — especially when the client is someone you want to keep."

> "Chazer changes that. It's an autonomous agent that handles all the follow-up — professionally, in the right tone, at exactly the right time — and only asks the owner to make one decision: the ones that actually needed a human."

---

### 0:30 – 1:30 | Problem + System Overview

**[Screen: Dashboard — zoom into stats bar]**

**Say:**
> "Here's the full picture. $83,000 overdue. Three invoices need my decision right now. Four emails were sent this morning — automatically — without me lifting a finger."

> "The agent runs every morning at 9am. Let me show you what it does."

**[Click: "▶ Run Sweep Now" button — trigger manual sweep]**

**Say:**
> "The sweep is starting. While it runs, let me show you the escalation logic."

**[Screen: Stay on dashboard — point to tier badges in invoice table]**

> "Each invoice is classified into one of three tiers. Green — Tier 1 — overdue 1 to 7 days. The agent sends a warm, friendly nudge. Amber — Tier 2 — 8 to 21 days. A firmer follow-up that references the prior email. Red — Tier 3 — 22 or more days. That's where the agent says 'this one needs you.'"

> "And see this one — DeltaWave, $55,000? That's flagged with the orange warning. High-value invoice. Even if it were only 3 days overdue, the agent would never auto-send on a $55,000 relationship without my approval."

---

### 1:30 – 3:00 | Live Demo Walkthrough

**[Screen: Refresh page — show updated audit log entry for sweep]**

**Say:**
> "The sweep is done. Let's look at what the agent just did."

**[Click: Audit Log tab]**

**[Screen: Audit Log Timeline — point to entries]**

> "Here's the full audit trail. Sent Tier-1 to Ember Creative — $1,400, 7 days overdue. Sent Tier-2 to Foxglove Labs — referenced the prior email from two weeks ago. Sent Tier-1 to Acme Corp."

> "And here — High Value Escalated for DeltaWave Media. The agent drafted an email but held it. It didn't send. It put it in my queue."

**[Click: Decisions tab]**

**[Screen: Decision Queue — 3-4 cards visible]**

> "This is the queue. Three items. The agent classified each one, drafted the email, told me why it escalated, and is now waiting for me."

**[Point to DeltaWave card at top]**

> "DeltaWave — 43 days overdue, $55,000. The agent wrote: 'High-value invoice exceeds threshold. Requires your approval.' And it's drafted the email — let me read it."

**[Scroll to show email draft in the card]**

> "Professional. Firm but not aggressive. Mentions the invoice number, the amount, the due date. The AI wrote this based on the invoice context — not from a template."

**[Click: "✓ Approve & Send"]**

**[Screen: Card slides out with green flash; toast notification "Email sent to DeltaWave Media"]**

> "Done. Email sent in one click. I reviewed it, I approved it, the agent sent it. Total time: 15 seconds."

**[Click: second decision card — "Edit Draft" button]**

**[Screen: Edit modal opens]**

> "And if I want to change the wording — I can. The agent's draft is a starting point. I can edit the subject, edit the body, and then approve. The human always stays in control."

**[Close modal without saving]**

---

### 3:00 – 4:00 | Tech Highlight

**[Screen: Switch to VS Code or terminal — show `agent/chazer_agent.py` briefly]**

**Say:**
> "Under the hood, this is a genuine agentic loop built on the Strands Agents SDK."

> "The agent is initialized with four tools: classify invoice, draft email, send email, and write audit log. When the sweep fires, the agent decides which tools to call, in what order, based on the invoice classification. It's not a prompt-response chatbot — it's an autonomous worker making decisions and taking actions."

**[Show `agent/tools/classify.py` briefly — point to Strands @tool decorator]**

> "Each tool is a decorated Python function that the Strands SDK exposes to the LLM. The LLM calls them. We just define what they do."

> "The LLM backend is Google Gemini 1.5 Flash, accessed via Strands' LiteLLM provider. The entire thing runs on a Supabase free tier — zero cost, zero servers, zero infrastructure."

**[Screen: Architecture diagram in doc 02 or README]**

> "pg_cron fires a Supabase Edge Function every morning. The Edge Function invokes the Python agent. The agent classifies, drafts, sends or escalates — and writes an immutable audit record for every single action."

---

### 4:00 – 5:00 | Vision & Close

**[Screen: Back to dashboard — full view]**

**Say:**
> "Chazer isn't about automating emails. It's about removing the social friction from a part of business that costs freelancers real money every month."

> "The average freelancer waits 47 days to get paid — versus 28 days for businesses with dedicated AR staff. That gap exists because of the discomfort and inconsistency of following up manually."

> "Chazer closes that gap. The agent handles the 85% that's routine. The owner handles the 15% that matters — in 15 seconds, with a ready-to-send draft already written."

> "It doesn't replace the owner's judgment. It removes everything that wasn't judgment to begin with."

**[Final screen: Dashboard with stats bar prominent — $83K, 3 decisions, sent emails]**

> "Chazer. Your invoices, chased."

---

## Dramatic Wow Moments

| Timestamp | Action | Visual Effect | Why It Works |
|-----------|--------|--------------|-------------|
| 0:03 | "$83,000 overdue" | Big stat card front-and-center | Establishes stakes immediately |
| 1:40 | Click "Run Sweep" | Spinner animates on button | Agent is doing real work live |
| 1:55 | Audit log updates | Timeline entries animate in | Proof the autonomous loop is real |
| 2:30 | "Approve & Send" | Card slides out + green toast | Satisfying one-click approval |
| 2:45 | "Edit Draft" modal | Smooth modal animation | Shows human stays in control |
| 3:10 | Show `@tool` decorator | Minimal Python code visible | Technical credibility |
| 4:45 | Final dashboard view | Full screen — clean, dark, professional | Leaves judges with strong visual |

---

## Presenter Notes

- **Speak slowly.** The feature is nuanced — rushing obscures the value.
- **Don't apologize** for the demo stack. "Free-tier Supabase" sounds scrappy — instead say "zero-infrastructure serverless."
- **Emphasize the audit log.** This is what separates Chazer from "just sending emails." The transparency of the audit trail is the trust mechanism.
- **On the tech section:** Don't read code. Point to a key line and explain what it does in English.
- **Avoid jargon:** "autonomous agent" is fine. "multi-agent orchestration" is not (doesn't apply and sounds inflated).
