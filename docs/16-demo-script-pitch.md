# 16 — Demo Script & Pitch
 
 > **Chazer** · 3-to-5 Minute AWS Hackathon Demo Script (Professional Agents Track)
 
 ---
 
 ## Setup Before Recording
 
 **Screen layout:**
 - Browser: Dashboard at `http://localhost:3000/dashboard` (or deployed Vercel URL)
 - Browser tab 2: Editorial Landing page at `http://localhost:3000/`
 - Terminal: hidden but ready with `python -m agent.main --sandbox` command
 - Database state: Fresh seed (8 invoices, $96,990 total overdue receivables)
 
 **Checklist:**
 - [ ] 4-Stage Horizontal Pipeline Visualizer visible above StatsBar on `/dashboard` and on `/`
 - [ ] All 8 invoices visible in receivables table
 - [ ] Decision queue has 3-4 items pending review
 - [ ] Audit log populated with immutable telemetry
 - [ ] Resend sandbox active (zero accidental live emails during recording)
 
 ---
 
 ## Minute-by-Minute Script
 
 ---
 
 ### 0:00 – 0:30 | Hook & Domain Stakes
 
 **[Screen: Dashboard — Aging Receivables view (`/dashboard`)]**
 
 **Say:**
 > "This is nearly $97,000 of work that's already been delivered — and hasn't been paid for."
 
 **[Pause 2 seconds. Let the numbers on the warm parchment canvas land.]**
 
 > "Every one of these clients owes money. Some for 7 days, some for 43. And the freelancer or small studio who did this work has been quietly dreading the follow-up, because chasing money feels socially awkward — especially with clients you want to keep."
 
 > "Chazer solves this. It's an autonomous collections agent built with the AWS Strands SDK that handles all routine outreach with calibrated, professional tone — and only interrupts the owner when an invoice actually requires human judgment."
 
 ---
 
 ### 0:30 – 1:15 | The 4-Stage Autonomous Pipeline Visualizer
 
 **[Screen: Point to the 4-Stage Horizontal Pipeline Visualizer at top of `/dashboard` or on `/`]**
 
 **Say:**
 > "Let's look at how the autonomous loop thinks. Right here at the top of the ledger is our 4-Stage Pipeline Visualizer."
 
 **[Click: "Simulate Sweep" button — watch the active stage pulse and cycle through stages 1 ➔ 2 ➔ 3 ➔ 4]**
 
 > "Stage 1 ingests the active receivables from Supabase Postgres. 8 invoices, dynamic aging calculations."
 
 > "Stage 2 evaluates our Tone & Risk Matrix. Invoices 1 to 7 days overdue get a warm Tier 1 nudge. 8 to 21 days get a firm Tier 2 follow-up. But if an invoice is 22+ days overdue, disputed, or exceeds our $10,000 threshold — like DeltaWave Media's $55,000 balance — the agent halts auto-send."
 
 > "Stage 3 splits into Dual-Lane Dispatch: routine nudges go out automatically via Resend with idempotency keys, while high-stakes notices route to our Decision Queue."
 
 > "Stage 4 records an immutable audit log entry synchronously before completing the cycle."
 
 ---
 
 ### 1:15 – 2:15 | Human-in-the-Loop Decision Queue
 
 **[Click: Decisions tab in Sidebar (`/decisions`)]**
 
 **[Screen: Decision Queue — 4 pending escalation cards]**
 
 **Say:**
 > "Here is the Decision Queue. Four high-stakes receivables held for my approval. The agent never auto-sends on large contracts or disputed invoices."
 
 **[Point to DeltaWave Media card at top]**
 
 > "DeltaWave Media — 43 days overdue, $55,000. Look at the escalation reason: 'High-value invoice ($55,000.00 >= $10,000 threshold).' The agent drafted a firm, professional notice using Grok and Gemini via LiteLLM. Let's inspect the draft."
 
 **[Click: "Edit Draft" button]**
 
 **[Screen: Edit modal with live word count and safety checklist]**
 
 > "Notice our safety guard: the modal enforces a 200-word ceiling and validates that the invoice ID is preserved. I can tweak any sentence directly."
 
 **[Click: "Approve & Send"]**
 
 **[Screen: Card slides out with green feedback, sidebar badge decrements]**
 
 > "Approved and dispatched in one click. Total review time: 10 seconds."
 
 ---
 
 ### 2:15 – 2:45 | Polyglot Architecture & AWS Strands Code
 
 **[Screen: Switch to terminal / IDE — show `agent/chazer_agent.py` and `agent/tools/classify.py`]**
 
 **Say:**
 > "Under the hood, Chazer implements a true Polyglot Architecture."
 
 > "For hackathon verification and CLI batch execution, we use the Python AWS Strands Agents SDK with four discrete tools: classify invoice, draft email with safety invariants, send email with idempotency, and write audit log. The LLM reasons over the tools to execute the sweep."
 
 > "For zero-cost production scheduling, we have full runtime parity in a native TypeScript Supabase Edge Function triggered daily by pg_cron."
 
 ---
 
 ### 2:45 – 3:00 | Vision & Close
 
 **[Screen: Back to dashboard `/dashboard` — full view]**
 
 **Say:**
 > "Chazer doesn't replace the business owner's relationship with their client. It removes the friction from everything that wasn't a relationship to begin with."
 
 > "Chazer: Calm authority. Autonomous collection. Zero awkward follow-ups."
 
 ---
 
 ## Dramatic Wow Moments Table
 
 | Timestamp | Action | Visual Effect | Why It Works |
 |---|---|---|---|
 | 0:05 | "$96,990 overdue" | Newsreader serif typography & KPI cards | Immediate financial stakes |
 | 0:35 | "Simulate Sweep" | 4-Stage visualizer pulsing with emerald highlight | Proves autonomous state machine logic |
 | 1:25 | DeltaWave inspection | $55k card with AI confidence pill & escalation trigger | Proves safety guardrails |
 | 2:05 | "Approve & Send" | Optimistic card removal & toast notification | Satisfying one-click workflow |
 | 2:25 | Python Strands code | Strands `@tool` decorators & LiteLLM routing | Deep technical credibility |
 | 2:55 | Monad UI full view | Warm parchment canvas & monospace ledger | Beautiful, memorable finish |

