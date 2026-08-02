# 🧾 Local Cashier App

A fast, offline **Point-of-Sale (POS) / Cashier desktop app** built for a single restaurant (originally a shawarma place in Egypt). Arabic-first with full **RTL**, it bundles cashier POS, receipts, staff salaries, stock (المخزن) with auto-deduction, supplier purchases + debt tracking, and flexible revenue reporting — all on one local machine. No internet, no server, no subscription.

**Version:** `1.0.0-beta.1`

![stack](https://img.shields.io/badge/Electron-31-47848F?logo=electron) ![stack](https://img.shields.io/badge/React-19-61DAFB?logo=react) ![stack](https://img.shields.io/badge/Vite-8-646CFF?logo=vite) ![stack](https://img.shields.io/badge/Tailwind_4-06B6D4?logo=tailwindcss) ![db](https://img.shields.io/badge/SQLite-better--sqlite3-003B57?logo=sqlite)

---

## ✨ Features

**Cashier (POS)**
- Arabic **RTL** interface with category-based menu and a live cart.
- Quick checkout: cashier name, total, and a *print* action (printer support — Feature 9, see [Roadmap](#-roadmap-and-status)).

**Receipts**
- Daily receipt numbering (`#5 | 31/07/2026`) that resets every new day, independent of the internal DB id.
- Each cashier can view and **delete their own receipts**; admins can delete any and see a full reports tab.
- **Deleting a receipt restores the consumed stock** automatically.

**Revenue reports** (`PeriodFilter`)
- Quick shortcuts (**Today / This Week**) plus flexible historical filters:
  Year+Month, a **specific date** (dd-mm-yyyy), and an **arbitrary from→to range**.
- Metric cards (revenue, profit) follow the selected period; **net revenue** subtracts that period's paid salaries and supplier payments.

**Salaries** (`الرواتب`)
- Employee list with **bonus/deduction**, pay-to-toggle.
- Permanent **salary payment history** (`سجل مدفوعات الرواتب`) with delete, filterable by month.
- Status is **derived** per month — staff auto-reset to "pending" each new month and can only be paid once per month.

**Inventory & sales stock** (`المخزن` + `المكونات`)
- Stock items with units (قطعة / كجم / لتر) and low-stock thresholds.
- **Product components**: link a menu item to its ingredients (inventory or other menu items) so every sale **auto-deducts** stock — pieces *and* weight, with unit conversion (e.g. `100 جرام → 0.1 كجم`) and recursive expansion for deals.
- **Blocking** low stock: the sale is refused with a clear, human-readable toast; nothing is saved.

**Purchases & supplier debt** (`مشتريات المخزن`)
- Record buying 7 كجم for 5,000 EGP paying 1,000 now: stock increases, 1,000 leaves revenue, remaining 4,000 tracked as debt.
- Pay off debt in partial slices at any time; delete reverses the stock and its payments.
- **Outstanding debt is always visible** — a global "مستحق للمورد" card + amber banner + a "debts only" view, independent of the history filter.

**Accounts**
- Login with security-question recovery; `admin` accounts can manage employees, salaries, and inventory, plus create/delete other users (guarded: no deleting your own or the last admin).

---

## 🧱 Tech Stack

| Layer    | Choice |
|----------|--------|
| Desktop  | [Electron](https://www.electronjs.org/) (v31) |
| UI       | [React 19](https://react.dev/) + [Tailwind CSS 4](https://tailwindcss.com/) |
| Build    | [Vite 8](https://vitejs.dev/) |
| Storage  | [SQLite](https://www.sqlite.org/) via [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) |
| Runtime DB | `pos_database.db` stored in Electron's `userData` dir |
| Tests    | Vitest (frontend) + Electron (backend) |
| Packaging| `electron-builder` (NSIS Windows installer) |

---

## 📁 Project Structure

```
Cashier App/
├─ electron/
│  ├─ main.cjs         # Main process, BrowserWindow, IPC handler registration
│  ├─ preload.cjs      # Safe IPC bridge (context-isolated) exposed to the renderer
│  └─ database.cjs     # All SQL + business logic (orders, stock, salaries, purchases)
├─ src/
│  ├─ App.jsx          # Auth + @router-ish view switching (POS / Dashboard / Receipts)
│  ├─ main.jsx
│  ├─ context/CartContext.jsx      # Cart state shared across the POS
│  ├─ components/PeriodFilter.jsx # Reusable period filter (today/date/range)
│  ├─ features/
│  │  ├─ login/LoginPage.jsx
│  │  ├─ cashier/     CashierPage.jsx, CashierReceiptsPage.jsx
│  │  └─ admin/       AdminDashboardPage.jsx (reports, menu, inventory)
│  └─ styles/index.css
├─ tests/backend.test.cjs   # Backend (DB) integration suite
├─ plans/upcoming-features.md
└─ package.json
```

> ⚠️ The folder already contains both the repo root **and** a nested `Cashier App/` folder (the actual app) — see [Repo layout](#repo-layout) below.

---

## 🚀 Getting Started

You need **Node.js ≥ 18** (see [Node & rebuild](#node--rebuild) for the native module caveat).

```bash
npm install          # runs postinstall → electron-rebuild for better-sqlite3
npm run electron:dev # non dev server + Electron
```

Or run only the web UI for quick iteration:

```bash
npm run dev
```

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server (renderer only) |
| `npm run electron:dev` | Vite + Electron dev |
| `npm run build` | Production renderer build (`dist/`) |
| `npm run electron:build` | Build + package a Windows installer (`release/`) |
| `npm test` | Backend DB integration tests |
| `npm run test:frontend` | Frontend (Vitest) tests |
| `npm run lint` | ESLint over the project |

---

## ✅ Testing

Backend tests exercise the **real SQLite layer** (in-memory DB) end-to-end — seeds, orders, stock deduction/restoration, salary and purchase flows:

```bash
npm test                # ~45 checks
npm run test:frontend   # ~12 checks (Vitest/jsdom)
```

> The backend tests run through Electron so `better-sqlite3` matches the app's ABI.

---

## 📦 Building a Release

```bash
npm run electron:build
```

Outputs a ready-to-install **NSIS** `.exe` (e.g. `release/Local Cashier App Setup 1.0.0-beta.1.exe`) with Start-menu + desktop shortcuts and a configurable install location.

---

## 🗄️ Data & Storage

- An SQLite file `pos_database.db` is created under Electron's `userData` path; tables are created/seeded idempotently via `initDatabase()`.
- Key tables: `users`, `employees`, `salary_payments`, `menu`, `inventory`, `product_components`, `orders`, `order_items`, `purchases`, `purchase_payments`.
- Seed a realistic dataset with `seeder/seed-test-db.cjs` (builds a standalone node-bundled `.exe`; `seeder/` is git-ignored).

---

## 🗺 Roadmap & Features

| # | Feature | Status |
|---|---------|--------|
| 1 | Delete-receipt button (admin + cashier) | ✅ |
| 2 | Revenue period filters (Today/Week/Year+Month) | ✅ |
| 3 | Daily receipt number reset | ✅ |
| 4 | Salary payment history | ✅ |
| 5 | Salary deduction linked to report period | ✅ |
| 6 | Date + date-range receipt filters | ✅ |
| 7 | Product components: auto-deduct stock | ✅ |
| 8 | Storage purchases + partial payment + debt | ✅ |
| 9 | **Printable receipts (customer + kitchen) + printer config** | ⏸️ *Paused* |

Feature 9 is designed but intentionally **paused while we wait for the client's printer hardware details** (model + whether there's a second printer for the kitchen). Plan: two receipt layouts, driver-based printing, configurable printer names. See `plans/upcoming-features.md`.

---

## 📝 Repo Layout

The git repository root is **`D:\Programming\Cashier App`** and contains two things:
- `Cashier App/` — the Electron app itself (where this README lives)
- `plans/` — design documentation (`upcoming-features.md`)

Run all commands from inside **`Cashier App/`**.

---

## 🤝 Contributing

This is a private project tailored to one restaurant. Pull requests welcome for improvements; open an issue for bugs or suggestions.