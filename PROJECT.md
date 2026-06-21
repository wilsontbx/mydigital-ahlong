# MyDigitalAhLong 🤜💰

> Your friendly neighbourhood digital ah long · serverless debt collection since 2026

A **serverless, URL-based expense splitter** app with **real-time Firebase sync**. The entire ledger is compressed into the URL hash as a fallback, but primarily syncs across devices via Firebase Realtime Database — no login required.

---

## Tech Stack

- **Vite** (v6) — build tool & dev server
- **TypeScript** (strict mode) — type-safe vanilla code
- **Firebase Realtime Database** — real-time cross-device sync (free tier)
- **fflate** — URL-safe compression of state into the hash (fallback)
- **GitHub Pages** — deployment via GitHub Actions
- **LocalStorage** — multi-group persistence on device (offline cache)

---

## Project Structure

```text
mydigital-ahlong/
├── index.html              # Single-page HTML shell
├── package.json            # Dependencies & scripts
├── tsconfig.json           # TypeScript config (strict)
├── vite.config.js          # Vite config (base path for GH Pages)
├── public/
│   ├── manifest.json       # PWA manifest (with deep link url_handlers)
│   ├── sw.js               # Service worker (offline caching + cross-context sync)
│   └── .well-known/        # URL handler verification
├── .github/
│   └── workflows/
│       └── deploy.yml      # CI/CD: build & deploy to GitHub Pages
└── src/
    ├── app.ts              # Entry point (state init, PWA sync, wire up)
    ├── style.css           # All styles (mobile-first, no preprocessor)
    ├── core/
    │   ├── types.ts        # Shared interfaces (Expense, GroupState, Debt)
    │   ├── state.ts        # State serialization, URL hash, localStorage, groups
    │   ├── expenses.ts     # Expense/member CRUD & debt simplification
    │   ├── firebase.ts     # Firebase config, real-time sync, listeners
    │   └── sync.ts         # Commit, importGroup, Firebase subscription, echo suppression
    ├── shared/
    │   └── utils.ts        # DOM helpers ($, $$, esc, showToast, pickRandom)
    └── ui/
        ├── dialogs.ts      # Dialog system, member menu, avatar picker, modals
        ├── render.ts       # All render functions + orchestrator
        ├── events.ts       # Event handler setup
        └── install.ts      # PWA install prompt, banner, modal
```

---

## Features

### Multi-Group Support

- Create multiple expense groups (tabs)
- Each group has its own id, members, expenses, and name
- Unique UUID per group for reliable sync/deduplication
- Random fun group names generated on creation
- Delete any group including the last one
- Landing page shown when no groups exist, with import link + install button

### Members

- Add/remove members from a group
- **Rename members** — updates name across all expenses (paidBy, addedBy, splitAmong), migrates avatar & payment
- "I am" selector to identify current user (stored in localStorage)
- Removing a member removes their associated expenses
- **Avatars**: 54 emoji icons sorted by category (faces, spooky, animals, objects)
- **Payment methods**: optional string per member (e.g. "DuitNow 012-345"), stored locally, shown in settlement

### Expenses

- Add expenses with description, amount, payer, and split selection
- **Split types**: Equal, Exact amounts, or Percentage-based splits
- **Categories**: Food, Transport, Accommodation, Shopping, Entertainment, Utilities, Other
- **Auto-suggest category**: Detects keywords in description (including Malaysian terms: makan, nasi, mamak, etc.)
- **Date picker**: Defaults to today, cannot select future dates
- Multi-currency support (MYR, SGD, USD, EUR, GBP, THB, JPY, KRW, IDR, AUD, CAD)
- **Filters**: Filter by category and date range, with sort toggle (Newest/Oldest)
- **Category breakdown**: Shows spending totals per category above the expense list
- **Settlement status**: Progress bar per expense showing how much has been paid back and who hasn't paid
- **Split details**: Click the split badge to expand per-person breakdown with settlement indicators
- Soft-delete expenses (logged as "❌ Deleted" in transaction log)
- Expenses locked after settlement per currency (settling MYR only locks MYR expenses)

### Debt Settlement

- **Simplified debts** algorithm (minimizes number of transactions)
- Grouped by currency
- "Mark as Settled" adds a settlement expense entry
- Per-expense settlement tracking: progress bar shows partial/full payment status
- Celebration screen when all debts are cleared

### Sharing & Sync

- **Firebase Realtime Database** for cross-device real-time sync (no login needed)
- Short share links via `?group=ID` when Firebase is enabled
- Every state change syncs to Firebase automatically
- Real-time listener — other devices see changes instantly
- Fallback: entire state serialized → compressed (fflate) → stored in URL hash
- Native Web Share API (`navigator.share`) on mobile, fallback to clipboard copy
- Social share buttons: WhatsApp, Telegram, X/Twitter, Facebook
- Opening a shared link auto-imports the group (matched by group id)
- Paste-to-import: URL input field to manually paste shared links
- Import available on both landing page and main app view
- Deep linking via `url_handlers` — Android PWA opens directly from shared links
- Cross-context sync via service worker Cache API (Safari → PWA on iOS 16+)
- "Group added!" toast on new import, silent update for existing groups
- SEO meta tags, Open Graph, and Twitter Card for link previews

### Currency Preference

- Drag-and-drop reorder of currency list
- First currency becomes the default for new expenses
- Touch drag support for mobile

### Theme

- Light/dark mode toggle (☀️/🌙 button)
- Respects system preference (`prefers-color-scheme`) by default
- User choice saved to localStorage and persists across sessions

### UI/UX

- Split all/none toggle buttons (visible when >2 members)
- Custom dialog system (replaces native alert/confirm/prompt) with meme quotes
- 🎲 Randomize button on group name dialogs
- Meme subtitles on every section ("assemble your broke friends", "log the financial trauma" etc.)
- Member action menu (tap member tag to rename, edit avatar, payment, or remove)
- Toast notifications
- Meme modal with randomized shaming quotes & emojis
- Randomized YouTube meme link on every click
- Responsive, mobile-first design
- Animated CSS (shake, bounce, pulse, fade)
- Emoji favicon (💸)

### PWA Install

- Fixed install banner at bottom (mobile only), dismissible via ✕ (saved to sessionStorage)
- Special dark-gradient install modal with perks after 3 expenses
- Landing page install button (mobile only)
- Clicking "Install" triggers the native browser install prompt (Chromium) or shows manual instructions
- Banner and modal hidden when app is already running in standalone mode
- Service worker registered for offline caching + cross-context group sync

---

## Scripts

```bash
npm run dev        # Start Vite dev server
npm run build      # Type-check + production build → dist/
npm run preview    # Preview production build locally
npm run typecheck  # TypeScript type-check only
```

---

## Deployment

Automated via GitHub Actions (`.github/workflows/deploy.yml`):

1. Push to `master` branch triggers workflow
2. Installs dependencies (`npm ci`)
3. Builds (`npm run build`)
4. Deploys `dist/` to GitHub Pages

Base URL: `/mydigital-ahlong/`

---

## Architecture

### State Management (`src/core/state.ts`)

- **Firebase Realtime Database**: Real-time sync to `groups/{groupId}` on every persist
- **URL Hash**: State is JSON-stringified → compressed with fflate → stored in the URL fragment (fallback)
- **LocalStorage**: Multiple groups stored under `mydigital-ahlong_groups` key (offline cache)
- **Avatars**: Stored in `mydigital-ahlong_avatars` (local only, not shared via URL)
- **Payment Methods**: Stored in `mydigital-ahlong_payments` (local only, not shared via URL)
- **Hash priority**: If URL has a hash, it checks whether the state matches an existing group (deduplicates on refresh/re-entry) and only imports as a new group if it's truly a shared link
- **Persistence**: Every render call saves state to localStorage, URL hash, and Firebase

### Expense Logic (`src/core/expenses.ts`)

- `addExpense()` — creates timestamped expense with unique ID, supports splitType (equal/exact/percent), splitValues, category, date
- `deleteExpense()` — soft-deletes by ID
- `addMember()` / `removeMember()` — manages group members
- `renameMember()` — renames member across all expenses and member list
- `calcBalances()` — computes net balance per member, handles equal/exact/percent split types
- `simplifyDebts()` — greedy algorithm to minimize settlement transactions (sort creditors/debtors, settle largest pairs first)

### Render Layer (`src/ui/render.ts`)

- Renders all UI sections (group switcher, members, expenses, settlements, transaction log, currency preferences)
- Single `render()` orchestrator function called after every state change

### Events (`src/ui/events.ts`)

- Event delegation for dynamic elements
- Drag-and-drop currency reordering (desktop + touch)
- Social share button handlers

### Sync (`src/core/sync.ts`)

- `commit()` — single persist function: updates `updatedAt`, saves to localStorage, debounced Firebase write
- `importGroup()` — imports a shared group, deduplicates by id, handles updatedAt conflict resolution
- `subscribeToGroup()` — subscribes to Firebase real-time updates with echo suppression
- `setLocalUpdatedAt()` — initializes local timestamp for echo suppression

### Dialogs (`src/ui/dialogs.ts`)

- Custom modal/dialog system with themed emojis and quotes
- Member action menu (avatar, payment, rename, remove)
- Meme pay-up modal and settlement celebration

---

## Supported Currencies

| Code | Symbol |
| ---- | ------ |
| MYR  | RM     |
| SGD  | S$     |
| USD  | $      |
| EUR  | €      |
| GBP  | £      |
| THB  | ฿      |
| JPY  | ¥      |
| KRW  | ₩      |
| IDR  | Rp     |
| AUD  | A$     |
| CAD  | C$     |

---

## Data Model

```ts
// Expense interface
{
  id: string;
  desc: string;
  amount: number;
  paidBy: string;
  splitAmong: string[];
  splitType: "equal" | "exact" | "percent";
  splitValues?: Record<string, number>;  // per-member amounts for exact/percent
  currency: string;
  category?: string;  // food, transport, accommodation, shopping, entertainment, utilities, other
  date: number;       // when it happened (timestamp)
  createdAt: number;  // when recorded
  updatedAt: number;  // last edit
  deleted: boolean;
}

// Member interface
{
  name: string;
  payment: string;   // e.g. "DuitNow 012-345"
  avatar: string;    // emoji
}

// GroupState
{
  id: string;
  name: string;
  members: Member[];
  expenses: Expense[];
  createdAt: number;
  updatedAt: number;
}
```

---

## License

> licensed by GitHub Pages · interest-free (for now) · we don't break legs, we break friendships 🦴
