# 07 — UI Components Specification

> **Chazer** · Next.js + Tailwind CSS Component Library

---

## 1. Component Hierarchy

```
<AppShell>
  ├── <Sidebar />
  │     ├── <NavLogo />
  │     └── <NavLinks />  (Dashboard, Decisions, Audit Log)
  │
  ├── <TopBar />
  │     ├── <SweepStatusIndicator />
  │     └── <TriggerSweepButton />
  │
  └── <PageContent>   (slot)
        │
        ├── [Dashboard Page]
        │     ├── <StatsBar />
        │     │     ├── <StatCard title="Total Overdue" />
        │     │     ├── <StatCard title="Pending Decisions" />
        │     │     └── <StatCard title="Sent This Week" />
        │     │
        │     └── <InvoiceTable />
        │           ├── <InvoiceRow />  (repeated)
        │           │     ├── <TierBadge />
        │           │     └── <AgingBar />
        │           ├── <EmptyState />
        │           └── <TableSkeleton />
        │
        ├── [Decisions Page]
        │     ├── <DecisionCard />  (repeated)
        │     │     ├── <InvoiceContext />
        │     │     ├── <EmailDraftPreview />
        │     │     ├── <EditDraftModal />
        │     │     └── <DecisionActions />  (Approve / Edit & Send / Reject)
        │     ├── <EmptyDecisionsState />
        │     └── <DecisionSkeleton />
        │
        └── [Audit Log Page]
              ├── <AuditTimeline />
              │     └── <AuditEntry />  (repeated)
              ├── <AuditFilters />
              └── <AuditSkeleton />
```

---

## 2. Component Contracts

### `<AppShell>`

```typescript
// No props — wraps all pages
// Internal state: sidebar collapsed/expanded (mobile)

interface AppShellProps {
  children: React.ReactNode;
}
```

---

### `<Sidebar>`

```typescript
interface NavLink {
  label: string;
  href: string;
  icon: React.ComponentType;
  badge?: number; // e.g., pending decisions count
}

// Internal state: active route from usePathname()
// No props — reads routes from constant
```

---

### `<StatsBar>`

```typescript
interface StatsBarProps {
  totalOverdue: number;        // dollar amount
  pendingDecisions: number;    // count
  sentThisWeek: number;        // count
  isLoading: boolean;
}

// Renders 3 <StatCard> components
// Loading state: 3 skeleton cards
```

---

### `<StatCard>`

```typescript
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;          // e.g., "across 4 clients"
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  accentColor?: "red" | "amber" | "green" | "purple";
  isLoading?: boolean;
}
```

**States:**
- Default: white card with colored left border
- Loading: pulsing skeleton
- Error: N/A (parent handles error)

---

### `<InvoiceTable>`

```typescript
interface InvoiceTableProps {
  invoices: Invoice[];
  isLoading: boolean;
  onRowClick?: (invoiceId: string) => void;
}

// Columns: Invoice ID | Client | Amount | Due Date | Days Overdue | Tier | Status | Last Contact
// Sortable by: Amount, Days Overdue, Due Date
// Filterable by: Tier, Status (dropdown filter above table)
```

---

### `<InvoiceRow>`

```typescript
interface InvoiceRowProps {
  invoice: Invoice;          // from API
  onClick?: () => void;
}

// Sub-components rendered inline:
// <TierBadge tier={invoice.tier} />
// <AgingBar daysOverdue={invoice.days_overdue} />
```

---

### `<TierBadge>`

```typescript
interface TierBadgeProps {
  tier: "TIER_1" | "TIER_2" | "TIER_3" | "UNCLASSIFIED";
  isHighValue?: boolean;
}

// Renders:
// TIER_1 → green pill "T1 · Nudge"
// TIER_2 → amber pill "T2 · Firm"
// TIER_3 → red pill "T3 · Final"
// isHighValue=true → prepends ⚠ icon in orange
```

---

### `<AgingBar>`

```typescript
interface AgingBarProps {
  daysOverdue: number;    // 0-60+
  maxDays?: number;       // default 60 — caps the bar width
}

// Visual: horizontal progress-style bar
// Color: green (1-7) → amber (8-21) → red (22+)
// Width: proportional to daysOverdue / maxDays, capped at 100%
// Label: "{daysOverdue} days overdue"
```

---

### `<DecisionCard>`

```typescript
interface DecisionCardProps {
  decision: Decision;
  onApprove: (id: string, content?: EmailContent) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
  isSubmitting: boolean;
}

// Layout:
// ┌────────────────────────────────────────────────┐
// │ ⚠ HIGH VALUE  INV-005 · DeltaWave Media        │
// │ $55,000 · 43 days overdue                      │
// │                                                 │
// │ Escalation reason: [reason text]               │
// │                                                 │
// │ AI Draft Email:                                 │
// │ ┌──────────────────────────────────────────┐   │
// │ │ Subject: Final Notice: Invoice #INV-005  │   │
// │ │ Body: Dear Accounts Payable...           │   │
// │ └──────────────────────────────────────────┘   │
// │                                                 │
// │ [Edit Draft]  [Reject]  [✓ Approve & Send]     │
// └────────────────────────────────────────────────┘
```

**States:**
- Default: above layout
- Submitting: Approve/Reject buttons replaced with spinner
- Rejected: card grays out with "Rejected" badge
- Error: toast notification; card remains interactive

---

### `<EmailDraftPreview>`

```typescript
interface EmailDraftPreviewProps {
  subject: string;
  body: string;
  tier: "TIER_1" | "TIER_2" | "TIER_3";
  llmConfidence: number;
}

// Renders email in a simulated email-client frame
// Shows AI confidence badge (e.g., "🤖 96% confident")
// Subject in bold; body in monospace-ish font
```

---

### `<EditDraftModal>`

```typescript
interface EditDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSubject: string;
  initialBody: string;
  onSave: (subject: string, body: string) => void;
}

// Full-screen modal on mobile, centered dialog on desktop
// Subject: single-line input
// Body: multi-line textarea (min 8 rows)
// Validation: subject non-empty; body contains invoice ID
// Word count indicator
// Save button → calls onSave; modal closes
```

---

### `<DecisionActions>`

```typescript
interface DecisionActionsProps {
  decisionId: string;
  onApprove: () => void;
  onReject: () => void;
  onEdit: () => void;
  isSubmitting: boolean;
}

// 3 buttons: [Edit Draft] (secondary) | [Reject] (ghost/destructive) | [Approve & Send] (primary/green)
// isSubmitting: all buttons disabled + spinner on Approve
```

---

### `<AuditTimeline>`

```typescript
interface AuditTimelineProps {
  entries: AuditEntry[];
  isLoading: boolean;
}

// Vertical timeline with connecting line
// Each entry shows: icon + action label + timestamp + metadata badge
```

---

### `<AuditEntry>`

```typescript
interface AuditEntryProps {
  entry: AuditEntry;
}

// Layout: [icon circle] — [action] · [invoice_id] · [timestamp]
//                           [metadata: tier, amount, resend_id]
//
// Icons by action:
//   TIER1/2_EMAIL_SENT → envelope icon (green)
//   TIER3_DRAFT_CREATED → document icon (amber)
//   HIGH_VALUE_ESCALATED → warning icon (orange)
//   OWNER_APPROVED → check circle (green)
//   OWNER_REJECTED → x circle (gray)
//   SEND_FAILED / LLM_FAILED → exclamation (red)
//   SWEEP_STARTED/COMPLETE → refresh icon (blue)
```

---

### `<SweepStatusIndicator>`

```typescript
interface SweepStatusIndicatorProps {
  lastSweepAt: string | null;   // ISO timestamp
  isSweeping: boolean;
}

// Renders: "Last sweep: 5 minutes ago" with a pulsing green dot
// While sweeping: "Sweep running..." with a spinning loader
// No last sweep: "Not yet run"
```

---

### `<TriggerSweepButton>`

```typescript
interface TriggerSweepButtonProps {
  onTrigger: () => Promise<void>;
  isDisabled: boolean;
  isSweeping: boolean;
}

// Primary button: "▶ Run Sweep Now"
// While sweeping: spinner + "Sweeping..."
// Disabled: 5 minutes after last sweep (rate limit)
```

---

## 3. Interactive & Empty States

### Loading States

| Component | Loading Pattern |
|-----------|----------------|
| `<InvoiceTable>` | `<TableSkeleton>`: 5 rows of gray pulsing bars |
| `<StatsBar>` | 3 `<StatCardSkeleton>` cards |
| `<DecisionCard>` | `<DecisionSkeleton>`: card-shaped gray block |
| `<AuditTimeline>` | 8 `<AuditEntrySkeleton>` rows |

### Empty States

```typescript
// No invoices overdue
<EmptyState
  icon={<CheckCircleIcon />}
  title="All caught up!"
  description="No overdue invoices requiring action. Your agent will alert you when something needs attention."
/>

// No pending decisions
<EmptyDecisionsState
  icon={<InboxIcon />}
  title="No decisions needed"
  description="Your agent is handling everything automatically. Items requiring your input will appear here."
/>

// Audit log empty
<EmptyState
  icon={<ClockIcon />}
  title="No agent activity yet"
  description="Run a sweep to see the agent in action. Activity will be logged here in real time."
/>
```

### Error States

```typescript
// Toast notifications (using react-hot-toast)
toast.error("Failed to approve decision. Please try again.");
toast.success("Email sent to DeltaWave Media.");

// Inline error (e.g., failed to fetch invoices)
<InlineError
  message="Could not load invoices. Check your connection."
  onRetry={fetchInvoices}
/>
```
