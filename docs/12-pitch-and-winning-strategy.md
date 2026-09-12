# 12 — Value Proposition & Competitive Strategy

> **Chazer** · AWS "Agents for Humans" Hackathon · Professional Agents Track

---

## 1. The "Why Now" Moment

Three forces converge in 2026 to make Chazer viable and timely:

### 1A. The Freelance Economy is Enormous and Underserved
- 59 million freelancers in the US; growing at 5% YoY
- The median freelancer earns $45K/year — a $4,000 unpaid invoice represents **9% of annual income**
- No major tool has applied LLM reasoning to invoice collections because they were all built before modern AI was deployable at zero marginal cost

### 1B. LLMs Just Got Cheap Enough for This Use Case
- Gemini 1.5 Flash processes 1 million tokens at ~$0.075 (or free at 60 req/min)
- A 200-word collection email draft + classification costs ~0.1 cents in LLM compute
- Before 2024, the LLM cost would have made this economically absurd for a $1,400 invoice

### 1C. Agentic SDKs Normalize Background Autonomy
- Strands Agents SDK (open-source, AWS-backed) provides production-grade patterns for tool-calling agents
- The pattern of "autonomous loop + human decision surface" is now a first-class architectural primitive, not a custom engineering challenge

---

## 2. Competitive Positioning

### Direct Competitors

| Tool | Core Limitation | Chazer's Advantage |
|------|----------------|-------------------|
| **QuickBooks Reminders** | Fixed-template emails, fixed schedule, no AI reasoning | Contextual escalation, tone calibration, dispute detection |
| **FreshBooks Automated** | Same template every tier, no client reply analysis | Reply classification, negotiation detection |
| **Bonsai** | Reminder-only, no escalation logic | Full escalation ladder, human-in-the-loop for Tier 3 |
| **Harvest** | No collections at all | Direct substitution for collections workflow |
| **Torii/CloudEagle/Spendflo** | SaaS spend management (B2B AR from buyer side) | Different problem: Chazer is on the seller side |

### Chazer's Defensible Differentiation

1. **Tone ladder, not template:** The same invoice at 7 days gets a different email than at 22 days — and the AI writes each one contextually, not from a fixed template.
2. **Dispute intelligence:** The only tool that detects "negotiation intent" vs "simple forget" and routes to human review accordingly.
3. **Trust through audit:** Every agent action is logged. Owners can see *why* the agent escalated. This is what moves a tool from "clever demo" to "thing I would trust with my client relationships."
4. **Human-in-the-loop exactly where it matters:** The agent doesn't ask for permission to send a friendly nudge. It only asks when a relationship is genuinely at stake (Tier 3, high-value, dispute).

---

## 3. Judging Criteria Alignment

### Technological Implementation (30% weight)

**What judges look for:** Genuine Strands Agents SDK usage; not a chatbot wrapper.

**How Chazer delivers:**
- Strands `Agent` with 4 registered tools: `classify_invoice`, `draft_email`, `send_email`, `write_audit_log`
- Tool-calling loop is the core mechanism — agent decides which tools to call and in what order based on invoice classification
- Background autonomous loop (not chat-triggered) via pg_cron → Edge Function → Python agent
- LiteLLM provider for Gemini (demonstrates Strands' provider abstraction)
- The Python agent code is in the repo and callable — not just mentioned in a README

**Score justification:** This is a genuine agentic loop, not a prompt-and-respond chatbot. The agent makes decisions about tool ordering, handles errors per-invoice, and produces side effects (DB writes, email sends) autonomously.

---

### Design & User Experience (25% weight)

**What judges look for:** Coherent product design, not just a tech demo.

**How Chazer delivers:**
- A single dashboard that tells the owner exactly what they need to know: what's overdue, what the agent did, what needs their decision
- The "Needs Your Decision" queue is the entire product's value proposition in one screen
- Dark-mode-first design system with glassmorphism stat cards, tier-colored badges, animated aging bars
- Zero-friction approval flow: read draft → one-click approve → done

---

### Potential Impact (25% weight)

**What judges look for:** Credible, specific, quantifiable real-world case.

**How Chazer delivers:**
- Target user is extremely concrete: freelancer chasing invoice, not "enterprises optimizing workflow"
- The financial impact is personal: 9% of annual income stuck in unpaid invoices
- The behavioral change is real: owners who would otherwise send one awkward email six weeks late are now getting systematic, toned, timely follow-up without lifting a finger
- The human decision surface is the key insight: the agent doesn't claim to handle everything — it claims to handle 85% of it and bring the other 15% to the human with a ready-to-send draft

---

### Creativity & Originality (10% weight)

**What judges look for:** Avoiding cliché hackathon categories.

**How Chazer avoids the traps:**
- ❌ Not a "Tinder for X" framing
- ❌ Not "sentiment analysis as the whole feature"  
- ❌ Not speech-to-text, translation, or facial recognition
- ❌ Not in the SaaS-spend-tracking space (Torii/Spendflo/etc.)
- ✅ Novel combination: autonomous agent + human decision surface + professional email craft + financial domain
- ✅ The "Tier 3 hold-for-human" pattern is the creative insight — most agents are either fully autonomous or fully human-directed; Chazer is deliberately hybrid, and the tier system encodes when to flip the switch

---

### Presentation (10% weight)

**What judges look for:** Clear demo showing end-to-end autonomous loop.

**How Chazer delivers:**
- Demo script (doc 16) explicitly shows: invoice ages → agent classifies → agent sends → agent escalates → owner approves
- The live data in the dashboard tells a story (8 seeded invoices at different ages = all 3 tiers visible simultaneously)
- Audit log provides the "proof" moment: "here's every decision the agent made autonomously in the last 24 hours"

---

## 4. Impact & ROI Metrics

| Metric | Before Chazer | With Chazer | Improvement |
|--------|-------------|------------|-------------|
| Days to first follow-up | 14–28 days (social friction delay) | 2–3 days (automated) | **~6x faster** |
| Follow-up consistency | 1 email per invoice (if remembered) | 3 automated touchpoints + escalation | **3x more touchpoints** |
| Owner time on collections/month | 3–5 hours | 10–15 minutes (review decisions only) | **~95% reduction** |
| Estimated bad debt reduction | — | 15–25% fewer write-offs (faster escalation = client less comfortable ignoring) | **$800–$1,600/year for median freelancer** |
| Client relationship incidents | Occasional (wrong tone, too aggressive/passive) | Near-zero (tier calibration prevents both extremes) | — |

---

## 5. Why Chazer Wins

The hackathon theme is **"makes someone dramatically better at the work they already do."**

Invoice collection is the work a freelancer already does — badly, late, anxiously, inconsistently.

Chazer doesn't add a new workflow. It takes the worst part of a workflow the owner already does and makes it invisible — except for the 15% of cases where the owner's judgment actually matters. That 15% is served by a ready-to-send AI draft with one-click approval.

**The agent doesn't replace the owner. It removes the parts the owner shouldn't have to do.**
