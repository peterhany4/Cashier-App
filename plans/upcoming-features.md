# 🗂️ Cashier App — Upcoming Features Plan

> **Last Updated:** 2026-07-31  
> **Project Stack:** Electron + React (Vite) + SQLite (better-sqlite3)  
> **Language:** Arabic UI (RTL)

---

## Overview

This document outlines the five upcoming feature areas for the Cashier App, broken down into clear implementation tasks with technical details for each.

---

## Feature 1 — Delete Receipt Button (Admin + Cashier Access) (✅ COMPLETED)

### Problem
- The receipts/orders log tab (`سجل الفواتير والتقارير`) is **only accessible to admins** (hardcoded in App.jsx). A regular cashier cannot navigate to it at all.
- There is no way to **delete a wrong or duplicate receipt** — neither for admins nor cashiers.

### What Needs to Change

#### 1A — Give Cashiers Access to Their Own Receipts Tab
- In `App.jsx`, the navigation toggle buttons (POS / Dashboard) are only rendered when `currentUser.role === 'admin'`.
- Add a **third view** called `receipts` that both admins and cashiers can access.
- The header nav bar should show a **"سجل فواتيري"** (My Receipts) button for cashiers.
- For admins the existing full reports tab already lives inside the Dashboard.
- A new lightweight `CashierReceiptsPage.jsx` component should be created that shows only that cashier's own orders (filtered by `order.cashier === currentUser.username`).

#### 1B — Delete Receipt Button
- Add a **delete button** (🗑️) to each row in both:
  - The admin's Reports tab in `AdminDashboardPage.jsx`
  - The new `CashierReceiptsPage.jsx`
- The delete button should trigger the existing `showConfirm()` modal pattern before deleting.
- **Admin** can delete **any** receipt. **Cashier** can only delete **their own** receipts.

#### Backend Changes Needed

**`electron/database.cjs`** — Add a new function:
```js
function deleteOrder(id) {
    // order_items already has ON DELETE CASCADE, so child rows are removed too
    db.prepare('DELETE FROM orders WHERE id = ?').run(id);
    return { success: true };
}
```

**`electron/preload.cjs`** — Expose the new IPC call:
```js
deleteOrder: (id) => ipcRenderer.invoke('db:deleteOrder', id),
```

**`electron/main.cjs`** — Register the IPC handler:
```js
ipcMain.handle('db:deleteOrder', (_, id) => db.deleteOrder(id));
```

#### Notes
- The `ON DELETE CASCADE` on `order_items.order_id` is already set up in the DB schema, so deleting a parent order automatically removes its items. No extra cleanup needed.
- Revenue metrics in the admin dashboard re-calculate from the `orders` array in React state, so deleting an order from state will automatically update the totals without any extra work.

---

## Feature 2 — Time-Filtered Revenue Reports (✅ COMPLETED)

### Problem
- The current revenue display is a **flat sum of all orders ever created** — there is no way to filter by period.
- The metric card on the dashboard shows one number with no context about what time period it covers.

### Proposed Solution: Year + Month Picker with Quick Shortcuts

Two layers of filtering — quick-access buttons for daily use, and a flexible year/month picker for historical review:

#### Quick Shortcuts (always visible)
| Button | Arabic Label | Logic |
|---|---|---|
| Today | اليوم | timestamp date equals today |
| This Week | هذا الأسبوع | timestamp falls within the current week |

#### Historical Picker (year + optional month)
| Selection | Result |
|---|---|
| `2026` only | Full year 2026 total (all months combined) |
| `2026` + `يوليو` | July 2026 specifically |
| `2025` + `مارس` | Historical — March 2025 |

- The **year dropdown** is auto-populated from the distinct years that actually exist in the orders data — it grows automatically as new years arrive with no manual maintenance.
- The **month dropdown** defaults to "كل السنة" (full year). Selecting a month narrows the view to that month only.
- Choosing a quick shortcut (Today / This Week) **clears** the year/month picker and vice versa — only one mode active at a time.

> **Why this approach is better for business:** Fixed presets like "Last Month" only ever show the current moment in time. The year + month picker lets you audit *any* historical period — e.g., "what did we make in February last year?" — which is exactly what a real business needs for reviewing performance over time.

#### Implementation Approach

**Frontend only** — No new DB function needed. All filtering runs on the already-fetched `orders` array in state:

```js
const [filterMode, setFilterMode] = useState('year-month'); // 'today' | 'week' | 'year-month'
const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
const [selectedMonth, setSelectedMonth] = useState(null); // null = show full year

// Auto-generate year list from actual order data
const availableYears = [...new Set(orders.map(o => new Date(o.timestamp).getFullYear()))].sort((a, b) => b - a);

const filteredOrders = orders.filter(order => {
    const d = new Date(order.timestamp);
    const now = new Date();

    if (filterMode === 'today') {
        return d.toDateString() === now.toDateString();
    }
    if (filterMode === 'week') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        return d >= startOfWeek;
    }
    if (filterMode === 'year-month') {
        if (d.getFullYear() !== selectedYear) return false;
        if (selectedMonth === null) return true; // full year view
        return d.getMonth() === selectedMonth;
    }
    return true;
});
```

#### UI Layout
```
┌──────────────────────────────────────────────────────────┐
│  ⚡ Quick:  [ اليوم ]   [ هذا الأسبوع ]                  │
│                                                           │
│  📅 حدد فترة:  [ 2026 ▾ ]  [ يوليو ▾ / كل السنة ]       │
│                                                           │
│  ✅ النتيجة: 47 فاتورة — إجمالي 12,850.00 جنية           │
└──────────────────────────────────────────────────────────┘
```

- Period toolbar sits **between the Reports header and the orders table**.
- A **summary strip** below the filters shows: receipt count + total revenue for the selected period.
- The existing search input (cashier name / receipt number) sits below the filters.

#### Optional Future Upgrade
- Add a monthly bar chart (using a simple SVG or lightweight `recharts`) showing revenue per month across the selected year.

---

## Feature 3 — Daily Receipt Number Reset (✅ COMPLETED)

### Problem
- The `orders` table uses SQLite `AUTOINCREMENT` as its primary key — the ID grows forever (1, 2, 3, ... 15,432 ...) and never resets.
- For daily operations, staff referring to "receipt #15,432" is awkward and meaningless. A real POS should show something like **"#5 | 31/07/2026"** — a clean daily counter that restarts every new day.

### Why Not Reset the DB ID?
The `AUTOINCREMENT` primary key must **never be reset** — it is used internally as a foreign key in `order_items`. Resetting it would cause ID collisions and broken data. It can technically count up to 9 quintillion, so it will never run out.

### Proposed Solution: Separate `daily_number` Column

Add a `daily_number` column to the `orders` table. This is a display-only counter that resets to `1` automatically every new calendar day — no button, no manual action needed.

#### Backend Changes Needed

**`electron/database.cjs`** — Modify `createOrder()` to compute and store the daily number:
```js
function createOrder(cashier, total, items) {
    const timestamp = new Date().toISOString();
    const todayStr = timestamp.split('T')[0]; // e.g. "2026-07-31"

    // Count how many orders already exist today to get the next daily number
    const todayCount = db.prepare(
        "SELECT COUNT(*) as cnt FROM orders WHERE timestamp LIKE ?"
    ).get(todayStr + '%');
    const dailyNumber = todayCount.cnt + 1;

    const insertOrder = db.prepare(
        'INSERT INTO orders (cashier, total, timestamp, daily_number) VALUES (?, ?, ?, ?)'
    );
    // ... rest of transaction unchanged
}
```

**DB Schema** — Add the column (existing databases need a migration):
```sql
ALTER TABLE orders ADD COLUMN daily_number INTEGER DEFAULT 1;
```
> For existing rows that don't have this column yet, a one-time migration script should back-fill `daily_number` by grouping orders per day and assigning sequential numbers.

#### Display Change
- Everywhere a receipt ID is shown (Admin Reports tab, Cashier Receipts tab), replace `#${order.id}` with `#${order.daily_number}` alongside the date.
- The internal `order.id` is still used for all DB operations (delete, fetch items, etc.) — it just isn't shown to the user anymore.

#### Result
```
Before:  #15432  |  Ahmed  |  31/07/2026  |  250.00 جنية
After:   #5      |  Ahmed  |  31/07/2026  |  250.00 جنية
```

---

## Feature 4 — Salary Payments Tracked as Receipts / Documented Transactions

### Problem
- When the admin marks a salary as "تم الصرف" (paid), there is no permanent record of **who was paid**, **how much**, and **on which date** beyond the single `last_payment_date` column in the `employees` table.
- If a salary is toggled back to "pending" the history is erased.
- There is no monthly salary history — you cannot look back and see "what did I pay in March?".

### Proposed Solution: Salary Payment History Table

#### New DB Table: `salary_payments`
```sql
CREATE TABLE IF NOT EXISTS salary_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER,
    employee_name TEXT NOT NULL,
    base_salary REAL NOT NULL,
    bonuses REAL NOT NULL,
    deductions REAL NOT NULL,
    net_pay REAL NOT NULL,
    payment_date TEXT NOT NULL,
    month_label TEXT NOT NULL,
    notes TEXT DEFAULT '',
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL
);
```

#### Flow Change: "Mark as Paid" Button
When the admin clicks **"تم الصرف"** (the `togglePaymentStatus` button):
1. A salary payment record is **inserted** into `salary_payments` with a snapshot of the salary at that exact moment (base + bonuses - deductions = net_pay).
2. The employee's `payment_status` remains `'paid'`, and `bonuses/deductions` reset to `0` for the next cycle automatically.
3. `last_payment_date` is updated as before.

> **Why a snapshot?** Because bonuses and deductions change each month — we need to store what was actually paid, not the current live state of the employee record.

#### New Salary History View
- Under the Salaries tab, add a collapsible **"سجل مدفوعات الرواتب"** section showing:
  - Employee name, role
  - Month label (يوليو 2026, يونيو 2026, ...)
  - Base salary, bonuses, deductions, net pay
  - Payment date
- Filterable by employee name and by month/year.

#### Revenue Deduction Logic
- The admin dashboard **net revenue** metric currently subtracts `totalPaidSalaries` (employees currently marked as paid).
- After this change, the deduction should come from `salary_payments` filtered to the **same period** selected in Feature 2 (the period filter, now Feature 2).
- Example: "This Month" net revenue = sum of orders this month − sum of salary net_pay records this month.

#### Backend Changes Needed
```js
// database.cjs — new functions
function recordSalaryPayment(employeeId, employeeName, baseSalary, bonuses, deductions, netPay, monthLabel) {
    const date = new Date().toISOString().split('T')[0];
    db.prepare(`
        INSERT INTO salary_payments 
        (employee_id, employee_name, base_salary, bonuses, deductions, net_pay, payment_date, month_label)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(employeeId, employeeName, baseSalary, bonuses, deductions, netPay, date, monthLabel);
    return { success: true };
}

function getSalaryPayments() {
    return db.prepare('SELECT * FROM salary_payments ORDER BY payment_date DESC').all();
}
```

---

## Feature 5 — Printable Receipts (Customer + Kitchen)

> **Status: DEFERRED — implement last, after all other features are complete.**

### Overview
Two separate receipt layouts need to be created and sent to two different printers:

| Printer | Audience | Content |
|---|---|---|
| Customer Printer | Customer | Full receipt: restaurant name, date, order items with prices, total |
| Kitchen Printer | Kitchen staff | Items only (no prices), order number, cashier name, time |

### Technical Approach (Electron)

Electron exposes the `webContents.print()` API which can target a specific printer by name. The flow would be:

1. When the cashier clicks **"حفظ وطباعة الفاتورة"**, the renderer sends the order data via IPC to the main process.
2. The main process opens a hidden `BrowserWindow`, loads the receipt HTML template, and calls `webContents.print({ deviceName: 'CustomerPrinterName' })`.
3. For the kitchen receipt, a second call targets a different `deviceName`.

### Configuration
- Printer names should be **configurable** — stored in a settings table or a local JSON config file.
- A new settings panel in the admin dashboard (e.g., "⚙️ إعدادات الطباعة") lets the admin pick from available system printers using `electron.webContents.getPrinters()`.

### Receipt Design
- **Customer receipt:** branded header, items table, subtotal, total, footer thank-you message.
- **Kitchen receipt:** large font, items only, time + cashier name, no prices shown.

---

## Implementation Order

```
Step 1 — Delete Receipt button (Backend + Admin UI)    ✅ COMPLETED
Step 2 — Revenue Period Filter (Reports Tab)           ✅ COMPLETED
Step 3 — Daily Receipt Number Reset (DB + UI)          HIGH PRIORITY
Step 4 — Salary Payment History (DB + UI)              MEDIUM PRIORITY
Step 5 — Link Salary deductions to Revenue period      MEDIUM PRIORITY
Step 6 — Printable Receipts + Printer Config           DEFERRED (last)
```

---

## Files Impact Summary

### Files to Modify
- `src/App.jsx` — Add `receipts` view state, show nav button for cashier role
- `src/features/admin/AdminDashboardPage.jsx` — Delete button on receipts, period filter UI, salary history section
- `electron/database.cjs` — `deleteOrder`, `daily_number` logic in `createOrder`, `salary_payments` table + insert/get functions
- `electron/preload.cjs` — Expose new IPC channels (`deleteOrder`, `recordSalaryPayment`, `getSalaryPayments`)
- `electron/main.cjs` — Register new IPC handlers for the above

### Files to Create
- `src/features/cashier/CashierReceiptsPage.jsx` — Cashier-facing personal receipts view with delete
- `src/features/receipts/CustomerReceipt.jsx` — Printable customer receipt template (Feature 5, deferred)
- `src/features/receipts/KitchenReceipt.jsx` — Printable kitchen ticket template (Feature 5, deferred)
