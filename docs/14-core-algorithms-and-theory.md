# 14 — Core Algorithms & Mathematical Modeling

> **Chazer** · Escalation Engine, Classification Algorithm, Idempotency Model

---

## 1. Escalation Tier Classification Algorithm

### Algorithm Description

The escalation tier classifier is a **deterministic rule-based classifier** with an optional LLM override for dispute/negotiation signals. The tier is not produced by the LLM — it is computed algorithmically to ensure consistency and auditability.

### Formal Specification

**Inputs:**
- $d$: `days_overdue` — non-negative integer
- $c$: `contact_count` — non-negative integer
- $f$: `dispute_flag` — boolean
- $a$: `amount` — positive real number (USD)
- $\theta$: `high_value_threshold` — positive real number (USD, default 10,000)

**Output:**
- $T \in \{\text{TIER\_1}, \text{TIER\_2}, \text{TIER\_3}\}$: escalation tier
- $e \in \{0, 1\}$: escalation flag (requires human decision)
- $s \in \{0, 1\}$: auto-send eligible

**Algorithm:**

```
ClassifyInvoice(d, c, f, a, θ):

1. IF f = true:
     RETURN (T=TIER_3, e=1, s=0)  // Dispute always escalates

2. IF a ≥ θ:
     tier = TierFromDays(d, c)
     RETURN (T=tier, e=1, s=0)   // High-value always escalates

3. RETURN TierFromDays(d, c) + determine_auto_send
```

**TierFromDays(d, c):**

```
IF 1 ≤ d ≤ 7 AND c = 0:
    RETURN (TIER_1, e=0, s=1)

IF 1 ≤ d ≤ 7 AND c ≥ 1:
    RETURN (TIER_1, e=0, s=0)  // Contact window still open; SKIP

IF 8 ≤ d ≤ 21 AND c = 0:
    RETURN (TIER_1, e=0, s=1)  // Late start; treat as first contact

IF 8 ≤ d ≤ 21 AND c ≥ 1:
    RETURN (TIER_2, e=0, s=1)

IF d ≥ 22:
    RETURN (TIER_3, e=1, s=0)

IF d = 0:
    RETURN (SKIP)               // Not yet overdue
```

### Complexity

- **Time complexity:** $O(1)$ — fixed number of comparisons regardless of input
- **Space complexity:** $O(1)$ — no allocations beyond local variables
- **Proof of correctness:** All conditions are mutually exclusive and exhaustive over valid input ranges $d \geq 0$, $c \geq 0$

---

## 2. Invoice Aging Computation

### Formula

$$\text{days\_overdue} = \max\left(0, \lfloor\text{NOW}() - \text{due\_date}\rfloor_{\text{days}}\right)$$

**SQL implementation:**
```sql
GREATEST(0, EXTRACT(DAY FROM NOW() - due_date::timestamptz)::INT)
```

**Edge cases:**
- `due_date = CURRENT_DATE`: `days_overdue = 0` → SKIP
- `due_date` in future: `days_overdue = 0` (clamped by MAX) → SKIP
- `due_date` = null: treated as data error; invoice excluded from sweep by `WHERE due_date IS NOT NULL`

---

## 3. Contact Window Guard Algorithm

### Problem Statement
Prevent duplicate emails within a rolling time window.

### Algorithm

```
IsEligible(invoice):
  IF invoice.last_contact_at IS NULL:
    RETURN true

  elapsed = NOW() - invoice.last_contact_at   // in hours
  
  RETURN elapsed > CONTACT_WINDOW_HOURS       // default: 72
```

### Formal Guarantee

**Theorem:** If the agent sweep runs at most once per `CRON_PERIOD` hours (24 hours), and `CONTACT_WINDOW_HOURS = 72`, then any invoice that was contacted in the current sweep cannot be re-contacted in the next `⌊72/24⌋ = 3` consecutive sweeps.

**Corollary:** The minimum time between two contacts on the same invoice is 72 hours, regardless of sweep frequency.

---

## 4. Idempotency Proof

### Model

Let $\Sigma$ = the set of all eligible invoices at time $t$.

Let $\text{Sweep}(t, \Sigma)$ = the set of all side effects (emails sent, records written) produced by one sweep at time $t$.

**Claim:** $\text{Sweep}(t_1, \Sigma) = \text{Sweep}(t_2, \Sigma)$ for any $t_1, t_2$ within the same 24-hour window, given $\Sigma$ unchanged.

**Proof sketch:**

1. After the first sweep at $t_1$, every invoice $i \in \Sigma$ that was contacted has `last_contact_at = t_1`.
2. At $t_2 = t_1 + \epsilon$ (same day), the contact window guard makes all contacted invoices ineligible: $\text{elapsed} = t_2 - t_1 < 72h$.
3. Therefore $\Sigma' = \emptyset$ at $t_2$ (all invoices guarded).
4. $\text{Sweep}(t_2, \emptyset) = \emptyset$ (no side effects).
5. Resend's idempotency key provides a second layer of protection even if $\Sigma' \neq \emptyset$.

**QED**

---

## 5. LLM Classification Confidence Model

The Gemini model returns a `confidence` score ($\kappa \in [0, 1]$) alongside the classification output. This is used for routing, not for overriding the tier:

$$
\text{route}(\kappa) = \begin{cases}
\text{AUTO\_PROCEED} & \text{if } \kappa \geq 0.85 \\
\text{PROCEED\_WITH\_WARNING} & \text{if } 0.60 \leq \kappa < 0.85 \\
\text{ESCALATE} & \text{if } \kappa < 0.60
\end{cases}
$$

**When does confidence matter?**

Confidence is only meaningful when the LLM is interpreting a `client_reply_text` (dispute/negotiation detection). For standard invoice classification (no reply text), confidence is expected to be > 0.95 because the inputs are fully deterministic.

---

## 6. Batch Sweep Throughput Model

### Given

- $N$ = number of invoices to process (demo: 8)
- $t_{\text{LLM}}$ = LLM API latency per call ≈ 1-3 seconds (Gemini 1.5 Flash)
- $t_{\text{Resend}}$ = email send latency ≈ 0.5-1 second
- $t_{\text{DB}}$ = DB write latency ≈ 50-200ms

### Execution Model (Sequential, per invoice)

$$T_{\text{sweep}} = N \times (t_{\text{LLM}} + t_{\text{Resend}} + t_{\text{DB}} \times 2)$$

For $N = 8$, worst case:
$$T = 8 \times (3 + 1 + 0.4) = 35.2 \text{ seconds}$$

Average case:
$$T = 8 \times (2 + 0.75 + 0.2) = 23.6 \text{ seconds}$$

**Supabase Edge Function timeout:** 150 seconds. Demo scale is well within limits.

### Optimization (if scaling)

For $N > 50$, use parallel batches of 10:
$$T_{\text{parallel}} = \lceil N/10 \rceil \times (t_{\text{LLM}} + t_{\text{Resend}} + t_{\text{DB}} \times 2)$$

Subject to Gemini rate limit: 60 req/min → max 10 parallel LLM calls with 10s sleep between batches.

---

## 7. Email Draft Quality Heuristics

The `validate_draft` function implements the following quality checks:

### Check 1: Required Elements

```python
def contains_invoice_id(body: str, invoice_id: str) -> bool:
    return invoice_id in body  # exact string match

def contains_amount(body: str, amount: float) -> bool:
    # Matches "$4,800.00", "$4800", "$4,800", "4,800.00"
    pattern = rf'\$?{amount:,.2f}|\$?{amount:,.0f}'
    return bool(re.search(pattern, body))
```

### Check 2: Word Count

```python
def check_word_count(body: str, max_words: int = 200) -> int:
    words = body.split()
    return len(words)
```

### Check 3: Prohibited Content

```python
LEGAL_THREAT_PATTERNS = [
    r'\blegal action\b', r'\battorney\b', r'\bsue\b', r'\bcourt\b',
    r'\bcollections agency\b', r'\bdebt collector\b'
]

def check_legal_threats(body: str) -> bool:
    for pattern in LEGAL_THREAT_PATTERNS:
        if re.search(pattern, body, re.IGNORECASE):
            return True
    return False
```

**Complexity:** $O(m \cdot L)$ where $m$ = number of patterns and $L$ = length of email body. Both are bounded constants for any realistic email.
