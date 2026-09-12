# 08 — Application Pages & View Hierarchy

> **Chazer** · Next.js App Router (v14+) Route Structure

---

## 1. Route Hierarchy

```
app/
├── layout.tsx                    → Root layout (AppShell: sidebar + topbar)
├── page.tsx                      → / → redirect to /dashboard
├── dashboard/
│   └── page.tsx                  → /dashboard → Aging Receivables + Stats
├── decisions/
│   └── page.tsx                  → /decisions → Decision Queue
├── audit/
│   └── page.tsx                  → /audit → Audit Log Timeline
├── api/ (not needed — using Supabase Edge Functions)
└── not-found.tsx                 → 404 page
```

**Navigation order:** Dashboard → Decisions → Audit Log

---

## 2. Page: `/dashboard` — Aging Receivables

### Purpose
The primary operational view. Shows all overdue invoices grouped by tier with a stats summary bar.

### ASCII Wireframe — Desktop (≥ 1280px)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ [⚡ Chazer]                              Last sweep: 3 min ago  [▶ Run Sweep]  │
├────────────────┬────────────────────────────────────────────────────────────────┤
│                │                                                                │
│  🗂 Dashboard  │   AGING RECEIVABLES                                            │
│  ⚠ Decisions  │   ┌────────────┐  ┌────────────┐  ┌────────────┐             │
│     [3]        │   │ $83,890    │  │ 3 Pending  │  │ 4 Sent     │             │
│  📋 Audit Log  │   │ Total Due  │  │ Decisions  │  │ This Week  │             │
│                │   └────────────┘  └────────────┘  └────────────┘             │
│                │                                                                │
│                │   [All Tiers ▼]  [All Status ▼]        [Search client...]    │
│                │                                                                │
│                │   ┌─────────────────────────────────────────────────────────┐ │
│                │   │ Invoice    │ Client       │ Amount   │ Due    │ Aging   │ │
│                │   ├─────────────────────────────────────────────────────────┤ │
│                │   │ INV-005    │ DeltaWave    │ $55,000  │ Jul 31 │ ████ 43d│ │
│                │   │ ⚠ HIGH     │ Media        │          │        │ T3      │ │
│                │   ├─────────────────────────────────────────────────────────┤ │
│                │   │ INV-002    │ Bluebell     │ $12,500  │ Aug 01 │ ████ 42d│ │
│                │   │            │ Studios      │          │        │ T3      │ │
│                │   ├─────────────────────────────────────────────────────────┤ │
│                │   │ INV-007    │ Bluebell     │ $7,200   │ Aug 10 │ ███  33d│ │
│                │   │            │ Studios      │          │        │ T3      │ │
│                │   ├─────────────────────────────────────────────────────────┤ │
│                │   │ INV-001    │ Acme Corp    │ $4,800   │ Aug 15 │ ███  28d│ │
│                │   │            │              │          │        │ T3      │ │
│                │   ├─────────────────────────────────────────────────────────┤ │
│                │   │ INV-008    │ Foxglove     │ $2,100   │ Aug 22 │ ██   21d│ │
│                │   │            │ Labs         │          │        │ T2      │ │
│                │   ├─────────────────────────────────────────────────────────┤ │
│                │   │ INV-003    │ Cascade Tech │ $890     │ Aug 28 │ ██   15d│ │
│                │   │            │              │          │        │ T2      │ │
│                │   ├─────────────────────────────────────────────────────────┤ │
│                │   │ INV-006    │ Ember        │ $1,400   │ Sep 05 │ █    7d │ │
│                │   │            │ Creative     │          │        │ T1      │ │
│                │   └─────────────────────────────────────────────────────────┘ │
└────────────────┴────────────────────────────────────────────────────────────────┘
```

### Data Fetched
- `GET /functions/v1/invoices?sort=days_overdue&order=desc`

### Key Interactions
- Click row → no navigation (future: invoice detail slide-over)
- Filter by Tier dropdown → client-side filter on `invoice.tier`
- Filter by Status dropdown → client-side filter on `invoice.status`
- "Run Sweep" button → `POST /functions/v1/sweep`; table refreshes after 5s

---

## 3. Page: `/decisions` — Decision Queue

### Purpose
The single most important demo screen. Shows all pending AI-drafted emails awaiting owner approval.

### ASCII Wireframe — Desktop

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ [⚡ Chazer]                              Last sweep: 3 min ago  [▶ Run Sweep]  │
├────────────────┬────────────────────────────────────────────────────────────────┤
│                │                                                                │
│  🗂 Dashboard  │   NEEDS YOUR DECISION  ─────────────────── 3 items pending    │
│  ⚠ Decisions  │                                                                │
│     [3]        │  ┌──────────────────────────────────────────────────────────┐ │
│  📋 Audit Log  │  │  ⚠ HIGH VALUE  ·  INV-005  ·  DeltaWave Media           │ │
│                │  │  $55,000  ·  43 days overdue                              │ │
│                │  │                                                            │ │
│                │  │  Escalation reason:                                        │ │
│                │  │  "Invoice 43 days overdue. Amount exceeds $10,000         │ │
│                │  │   threshold. High-value client requires your approval."   │ │
│                │  │                                                            │ │
│                │  │  ──── AI-Drafted Email ────────────────────────────────  │ │
│                │  │  From: reminders@chazer.dev                               │ │
│                │  │  To: billing@deltawave.com                                 │ │
│                │  │  Subject: Final Notice: Invoice #INV-005 — $55,000.00    │ │
│                │  │                                                            │ │
│                │  │  Dear Accounts Payable,                                    │ │
│                │  │                                                            │ │
│                │  │  This is a formal final notice regarding invoice           │ │
│                │  │  #INV-005 for $55,000.00, which was due on July 31st...  │ │
│                │  │                                       [🤖 96% confident]  │ │
│                │  │                                                            │ │
│                │  │  [✏ Edit Draft]    [✕ Reject]    [✓ Approve & Send]      │ │
│                │  └──────────────────────────────────────────────────────────┘ │
│                │                                                                │
│                │  ┌──────────────────────────────────────────────────────────┐ │
│                │  │  T3  ·  INV-002  ·  Bluebell Studios                     │ │
│                │  │  $12,500  ·  42 days overdue  ·  2 prior contacts        │ │
│                │  │  ...                                                       │ │
│                │  │  [✏ Edit Draft]    [✕ Reject]    [✓ Approve & Send]      │ │
│                │  └──────────────────────────────────────────────────────────┘ │
│                │                                                                │
│                │  ┌──────────────────────────────────────────────────────────┐ │
│                │  │  T3  ·  INV-001  ·  Acme Corp                           │ │
│                │  │  $4,800  ·  28 days overdue  ·  2 prior contacts         │ │
│                │  │  ...                                                       │ │
│                │  └──────────────────────────────────────────────────────────┘ │
└────────────────┴────────────────────────────────────────────────────────────────┘
```

### "Edit Draft" Modal

```
┌─────────────────────────────────────────────────────────────┐
│  Edit Email Draft — INV-005                              [✕] │
├─────────────────────────────────────────────────────────────┤
│  Subject:                                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Final Notice: Invoice #INV-005 — $55,000.00 Overdue    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Body:                                                       │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Dear Accounts Payable,                                  │ │
│  │                                                          │ │
│  │ This is a formal final notice...                        │ │
│  │                                                          │ │
│  │ [editable text area — 8 rows minimum]                   │ │
│  └────────────────────────────────────────────────────────┘ │
│  Word count: 87 / 200                                        │
│                                                              │
│  ⚠ Must contain: invoice ID, dollar amount                  │
│                                                              │
│              [Cancel]    [Save & Approve]                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Page: `/audit` — Audit Log Timeline

### Purpose
Full transparency into every action the agent took. Builds trust. Great for demo narrative.

### ASCII Wireframe — Desktop

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ [⚡ Chazer]                                              [▶ Run Sweep]          │
├────────────────┬────────────────────────────────────────────────────────────────┤
│                │                                                                │
│  🗂 Dashboard  │  AGENT ACTIVITY LOG  ─────────────── [Filter by action ▼]    │
│  ⚠ Decisions  │                                                                │
│     [3]        │  Sep 12, 2026 — 09:02 AM UTC                                  │
│  📋 Audit Log  │  │                                                             │
│                │  ●─── 🔄 SWEEP_COMPLETE · 50s · 8 invoices processed          │
│                │  │    Sent: 4  ·  Escalated: 4  ·  Failed: 0                  │
│                │  │                                                             │
│                │  ●─── ⚠ HIGH_VALUE_ESCALATED · INV-005 · $55,000              │
│                │  │    Reason: Exceeds $10,000 threshold. Pending approval.     │
│                │  │    Confidence: 96%                                          │
│                │  │                                                             │
│                │  ●─── 📩 TIER3_DRAFT_CREATED · INV-002 · $12,500             │
│                │  │    22+ days. 2 prior contacts. Draft held for approval.     │
│                │  │                                                             │
│                │  ●─── ✉ TIER2_EMAIL_SENT · INV-008 · $2,100                  │
│                │  │    Resend ID: re_abc123  ·  billing@deltawave.com           │
│                │  │                                                             │
│                │  ●─── ✉ TIER2_EMAIL_SENT · INV-003 · $890                     │
│                │  │                                                             │
│                │  ●─── ✉ TIER1_EMAIL_SENT · INV-006 · $1,400                  │
│                │  │                                                             │
│                │  ●─── ✉ TIER1_EMAIL_SENT · INV-004 · $3,200                  │
│                │  │                                                             │
│                │  ●─── 🔄 SWEEP_STARTED · 09:02:01 AM                          │
│                │                                                                │
│                │  Sep 11, 2026 — 09:00 AM UTC                                  │
│                │  │                                                             │
│                │  ●─── ✅ OWNER_APPROVED · INV-010 · DeltaWave Media          │
│                │       Edited and sent. Resend ID: re_xyz789                    │
└────────────────┴────────────────────────────────────────────────────────────────┘
```

---

## 5. Responsive Breakpoints

### Desktop (≥ 1280px)

- Sidebar visible (240px fixed width)
- Invoice table shows all 8 columns
- Stats bar: 3 cards in a row
- Decision cards: full width with side-by-side email preview and actions
- Edit modal: centered dialog (max-width 640px)

### Tablet (768px – 1279px)

- Sidebar collapses to icon-only strip (60px); labels hidden
- Invoice table: hide "Last Contact" and "Services" columns; show 6 columns
- Stats bar: 3 cards in a row (smaller padding)
- Decision cards: stack vertically; email body truncated at 3 lines with "Show more"
- Edit modal: 90% viewport width

### Mobile (< 768px)

- Sidebar replaced by bottom tab bar (Dashboard | Decisions | Audit)
- Invoice table: cards list instead of table rows
  ```
  ┌─────────────────────────────┐
  │ INV-005 · T3 · ⚠ HIGH      │
  │ DeltaWave Media             │
  │ $55,000  ·  43 days overdue │
  └─────────────────────────────┘
  ```
- Stats bar: horizontal scroll (each card 140px wide)
- Decision cards: full-width; Approve/Reject as bottom sheet action buttons
- Edit modal: full-screen slide-up sheet
- Top bar: "Chazer" logo + hamburger → opens bottom drawer with nav links

### CSS Breakpoint Tokens (Tailwind)

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    screens: {
      'sm': '640px',
      'md': '768px',   // tablet breakpoint
      'lg': '1024px',
      'xl': '1280px',  // desktop breakpoint
    }
  }
}
```

---

## 6. Page Metadata (Next.js)

```typescript
// app/dashboard/page.tsx
export const metadata = {
  title: "Dashboard — Chazer",
  description: "View all overdue invoices and aging receivables managed by your Chazer agent.",
};

// app/decisions/page.tsx
export const metadata = {
  title: "Decision Queue — Chazer",
  description: "Review and approve AI-drafted collection emails before they are sent to clients.",
};

// app/audit/page.tsx
export const metadata = {
  title: "Agent Activity Log — Chazer",
  description: "Full audit trail of every action taken by your autonomous invoice collection agent.",
};
```
