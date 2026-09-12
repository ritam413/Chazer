# 09 — Design System & UI/UX Tokens

> **Chazer** · Tailwind CSS Design System

---

## 1. Design Concept

**"Calm Authority"** — Chazer handles the stressful parts of business so the owner feels in control, not anxious. The visual language reflects this: dark, professional, clear hierarchy, strategic use of warm amber/red only for genuine urgency (not decorative alarm).

- **Dark-first** — dashboard lives in a dark shell (owners using this late at night, checking cash flow)
- **Surgical color** — red means Tier-3 (real problem), amber means Tier-2, green is sent/resolved. Not decorative.
- **Glass surfaces** — stat cards use glassmorphism on a dark gradient background
- **Micro-animations** — sweep indicator, tier badge pulse, success flash on approve

---

## 2. Color Palette

### Core Brand Tokens

| Token | HEX | HSL | Usage |
|-------|-----|-----|-------|
| `chazer-purple` | `#7C3AED` | `hsl(262, 79%, 57%)` | Brand primary, logo, active nav |
| `chazer-purple-light` | `#A78BFA` | `hsl(258, 90%, 75%)` | Hover states, highlights |
| `chazer-purple-dark` | `#5B21B6` | `hsl(263, 69%, 41%)` | Pressed states |

### Semantic Tokens

| Token | HEX | HSL | Usage |
|-------|-----|-----|-------|
| `surface-base` | `#0F0F13` | `hsl(252, 15%, 7%)` | Page background |
| `surface-card` | `#18181F` | `hsl(252, 14%, 11%)` | Card / sidebar background |
| `surface-elevated` | `#22222C` | `hsl(252, 13%, 15%)` | Hover / elevated card |
| `surface-glass` | `rgba(255,255,255,0.05)` | — | Glassmorphism card fill |
| `border-subtle` | `#2E2E3A` | `hsl(252, 13%, 21%)` | Card borders, dividers |
| `border-focus` | `#7C3AED` | — | Focus ring color |

### Text Tokens

| Token | HEX | Usage |
|-------|-----|-------|
| `text-primary` | `#F0F0F5` | Main content, headings |
| `text-secondary` | `#9090A8` | Subtitles, metadata |
| `text-muted` | `#5A5A72` | Placeholders, disabled |
| `text-on-accent` | `#FFFFFF` | Text on colored buttons |

### Status / Tier Tokens

| Token | HEX | HSL | Meaning |
|-------|-----|-----|---------|
| `tier1-green` | `#22C55E` | `hsl(142, 70%, 45%)` | Tier 1 — friendly nudge |
| `tier1-green-bg` | `#14532D` | `hsl(142, 72%, 20%)` | Tier 1 badge background |
| `tier2-amber` | `#F59E0B` | `hsl(38, 92%, 50%)` | Tier 2 — firm reminder |
| `tier2-amber-bg` | `#78350F` | `hsl(32, 81%, 26%)` | Tier 2 badge background |
| `tier3-red` | `#EF4444` | `hsl(0, 84%, 60%)` | Tier 3 — final notice |
| `tier3-red-bg` | `#7F1D1D` | `hsl(0, 63%, 30%)` | Tier 3 badge background |
| `high-value-orange` | `#F97316` | `hsl(25, 95%, 53%)` | High-value invoice flag |
| `success-green` | `#4ADE80` | `hsl(142, 69%, 58%)` | Approved / sent confirmation |
| `error-red` | `#F87171` | `hsl(0, 90%, 71%)` | Error states |

---

## 3. Typography

### Font Pairings

```css
/* Primary sans-serif — UI text, body */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

/* Monospace — invoice IDs, amounts, code */
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');
```

### Type Scale

| Role | Size | Weight | Line Height | Font | Usage |
|------|------|--------|-------------|------|-------|
| `display-lg` | 2.25rem / 36px | 700 | 1.2 | Inter | Page stat "Total Overdue" value |
| `display-sm` | 1.5rem / 24px | 600 | 1.3 | Inter | Section headings |
| `heading` | 1.125rem / 18px | 600 | 1.4 | Inter | Card titles |
| `body-lg` | 1rem / 16px | 400 | 1.6 | Inter | Email draft body, descriptions |
| `body-sm` | 0.875rem / 14px | 400 | 1.5 | Inter | Table cells, metadata |
| `caption` | 0.75rem / 12px | 500 | 1.4 | Inter | Timestamps, badges, word count |
| `mono` | 0.875rem / 14px | 400 | 1.6 | JetBrains Mono | Invoice IDs, amounts, Resend IDs |

---

## 4. Tailwind Config Extension

```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        chazer: {
          purple: '#7C3AED',
          'purple-light': '#A78BFA',
          'purple-dark': '#5B21B6',
        },
        surface: {
          base: '#0F0F13',
          card: '#18181F',
          elevated: '#22222C',
        },
        border: {
          subtle: '#2E2E3A',
        },
        tier1: { DEFAULT: '#22C55E', bg: '#14532D' },
        tier2: { DEFAULT: '#F59E0B', bg: '#78350F' },
        tier3: { DEFAULT: '#EF4444', bg: '#7F1D1D' },
        'high-value': '#F97316',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
        sm: '8px',
        md: '16px',
      },
      boxShadow: {
        'glass': '0 4px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        'card': '0 2px 12px rgba(0, 0, 0, 0.3)',
        'purple-glow': '0 0 20px rgba(124, 58, 237, 0.3)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'sweep-spin': 'spin 1s linear infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
};
```

---

## 5. Elevation & Glassmorphism

### Card System

```css
/* Standard stat card (glassmorphism) */
.glass-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05);
  border-radius: 12px;
}

/* Decision card */
.decision-card {
  background: #18181F;
  border: 1px solid #2E2E3A;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  transition: border-color 150ms ease, box-shadow 150ms ease;
}

.decision-card:hover {
  border-color: rgba(124, 58, 237, 0.4);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(124, 58, 237, 0.2);
}

/* High-value decision card — orange accent */
.decision-card--high-value {
  border-color: rgba(249, 115, 22, 0.4);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3), 0 0 20px rgba(249, 115, 22, 0.1);
}
```

### Elevation Levels

| Level | Shadow | Use Case |
|-------|--------|---------|
| 0 — Flat | none | Page background, sidebar |
| 1 — Card | `0 2px 12px rgba(0,0,0,0.3)` | Invoice table rows, audit entries |
| 2 — Raised | `0 4px 24px rgba(0,0,0,0.4)` | Stat cards, decision cards |
| 3 — Modal | `0 20px 60px rgba(0,0,0,0.6)` | Edit modal dialog |

---

## 6. Micro-Interactions & Animations

### Interaction Catalogue

| Trigger | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Page load | `fade-in` (all cards stagger) | 300ms + 50ms stagger | `ease-out` |
| Approve button click | Green flash + card slide-out | 400ms | `ease-in-out` |
| Reject button click | Card grays out + opacity 0.4 | 200ms | `ease` |
| Sweep button click | Button spinner + TopBar indicator pulse | Until sweep resolves | linear |
| TierBadge TIER_3 | Subtle pulse animation (3s repeat) | 3s | cubic-bezier |
| Invoice row hover | Slight right translate (2px) | 150ms | ease |
| Edit modal open | Slide up from center | 250ms | `ease-out` |
| Toast appear | Slide in from right | 300ms | spring |
| Stats bar load | Count-up animation (0 → final value) | 800ms | `ease-out` |

### AgingBar Animation

```css
/* AgingBar fills to its target width on mount */
.aging-bar-fill {
  width: 0;
  transition: width 600ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.aging-bar-fill.mounted {
  width: var(--target-width); /* set via inline style */
}
```

---

## 7. Sidebar Design

```
┌─────────────────┐
│  ⚡ Chazer      │  ← Logo: chazer-purple icon + Inter 600 white text
│                 │
│  ─────────────  │
│  🗂 Dashboard   │  ← Active: purple bg (#7C3AED 20% opacity) + purple text
│  ⚠ Decisions   │  ← Badge: red pill showing count (e.g., "3")
│     3           │
│  📋 Audit Log   │  ← Inactive: text-secondary color
│                 │
│  ─────────────  │
│                 │
│  ●  Sweep Status│  ← Pulsing green dot when active
│  3 min ago      │
└─────────────────┘
```

---

## 8. Button System

| Variant | Background | Text | Border | Use Case |
|---------|-----------|------|--------|---------|
| `primary` | `chazer-purple` | white | none | Approve & Send |
| `success` | `tier1-green` (#22C55E) | white | none | Confirm actions |
| `secondary` | `surface-elevated` | `text-primary` | `border-subtle` | Edit Draft |
| `ghost` | transparent | `text-secondary` | `border-subtle` | Cancel |
| `destructive` | transparent | `tier3-red` | `tier3-red 40%` | Reject |
| `icon` | transparent | `text-secondary` | none | Icon-only buttons |

All buttons: `border-radius: 8px`, `transition: all 150ms ease`, `active:scale-95`
