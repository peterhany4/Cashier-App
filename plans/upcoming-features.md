# 🗂️ Cashier App — Upcoming Features Plan

> **Last Updated:** 2026-08-01  
> **Project Stack:** Electron + React (Vite) + SQLite (better-sqlite3)  
> **Language:** Arabic UI (RTL)

---

## Overview

This document outlines the upcoming feature areas for the Cashier App, broken down into clear implementation tasks with technical details for each.

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

## Feature 4 — Salary Payments Tracked as Receipts / Documented Transactions (✅ COMPLETED)

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

#### Implementation Notes (what was actually built)
- **Delete button on history rows** — Each row in `سجل مدفوعات الرواتب` has a 🗑️ button (with `showConfirm()` modal) backed by `deleteSalaryPayment(id)` exposed as `db:deleteSalaryPayment`. Deleting a record reloads employees so the status button stays in sync.
- **Payment status is now derived, not stored** — `getEmployees()` computes `payment_status` from `salary_payments`: an employee is `paid` **only if** they have a payment record in the **current** month. This means:
  - Every employee **auto-resets to `معلق`** at the start of each new month (no record that month).
  - An employee **cannot be paid twice in the same month** — `togglePaymentStatus()` returns `alreadyPaidThisMonth` and the button is disabled (`تم الصرف هذا الشهر 🟢`).
  - The **only** way to undo a payment is to delete that month's record from the history — the employee then syncs back to pending automatically.
- **`last_payment_date`** is derived from the most recent payment record (used for display only).
- **Month filter fix** — the salary-history month dropdown uses 1-based values (1–12) matching the stored `payment_date` (`YYYY-MM-DD`), so each Arabic month filters its own records correctly.
- Net revenue metric deducts `salary_payments.net_pay` **filtered to the same period** as the Feature 2 report filter (implemented here, tracked as Step 5 below).

#### User Account Management (bonus)
- The Salaries tab now lists all created **user accounts** (`users` table) with a 🗑️ delete button.
- Backend `getUsers()` returns only safe fields (`id, username, role`) and `deleteUser(id, currentUsername)` guards against deleting your own active account or the **last remaining admin**.
- Deleting an account does **not** touch the cashier's receipts — `orders.cashier` stores the username as plain text (no FK to `users`), so their order history stays intact.

---

## Feature 6 — Receipts Tab: Filter by a Specific Date or a Date Range (dd-mm-yyyy) (✅ COMPLETED)

### Problem
- Feature 2 added quick shortcuts (Today / This Week) and a year + month picker, but neither lets the admin answer a simple question like *"what did we sell on **15-03-2026**?"* or *"what did we make **between 01-01-2026 and 31-01-2026**?"*
- A real business regularly needs an exact-day audit (daily closing, checking a specific incident) or an arbitrary range that doesn't line up with months or weeks.

### Proposed Solution: Specific Date + From/To Range Modes

Add two new filter modes to the existing `PeriodFilter` component — they sit beside Today / This Week / Year+Month and follow the same **"one mode active at a time"** rule (choosing one clears the others).

| Mode | Label | Logic |
|---|---|---|
| Specific Date | 📅 يوم محدد | `order.timestamp`'s **local** date equals the picked day |
| Date Range | 📆 من ... إلى ... | local date is within `[from, to]` **inclusive** |

#### Input Format (dd-mm-yyyy)
- The HTML `<input type="date">` internally works in ISO (`yyyy-mm-dd`), but the UI must **display and label** the Arabic format **dd-mm-yyyy** (day-month-year, as used in Egypt) — e.g. `15-03-2026`.
- Parsing must be done on **local date components** (`getFullYear() / getMonth() / getDate()`) — the same approach `filterOrdersByPeriod()` in `src/components/PeriodFilter.jsx` already uses — to avoid UTC timezone off-by-one errors.

#### Implementation (frontend only — no DB change)
`src/components/PeriodFilter.jsx` — extend `filterOrdersByPeriod()` and the toolbar:

```js
const [selectedDate, setSelectedDate] = useState('');   // 'yyyy-mm-dd'
const [dateFrom, setDateFrom] = useState('');           // 'yyyy-mm-dd'
const [dateTo, setDateTo] = useState('');

// inside filterOrdersByPeriod(...): build dayStr from local components
const dayStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

if (filterMode === 'date') {
    return dayStr === selectedDate;                    // single exact day
}
if (filterMode === 'range') {
    return dayStr >= dateFrom && dayStr <= dateTo;     // inclusive range
}
```

- A small `pad(n)` helper produces the `yyyy-mm-dd` string from local components.
- `getPeriodDescription()` gains two new strings: `مبيعات يوم 15-03-2026` and `من 01-01-2026 إلى 31-01-2026`.
- Selecting a quick shortcut or the year/month picker resets `selectedDate / dateFrom / dateTo` and vice versa.
- The summary strip (receipt count + total revenue) updates automatically because it is derived from `filteredOrders`.

#### Revenue Note
Feature 4 (salaries) and Feature 8 (purchases) deduct from **net revenue using the same period** — they must also handle the new `date` and `range` modes so the net-revenue number always matches the visible order list.

#### Implementation Notes (what was actually built)
- **`src/components/PeriodFilter.jsx`** — `filterOrdersByPeriod()` accepts `(orders, filterMode, selectedYear, selectedMonth, selectedDate, dateFrom, dateTo)` and handles the new `date` + `range` modes via a `toLocalDateStr()` helper (local components, avoids UTC off-by-one). The component gained controlled props `selectedDate / dateFrom / dateTo / onDateChange / onDateFromChange / onDateToChange` (same dual controlled/uncontrolled pattern as the existing year/month state), a new toolbar row "📅 تحديد يوم محدد" + "📆 فترة زمنية", and `getPeriodDescription()` strings `مبيعات يوم 15-03-2026` / `مبيعات من 01-01-2026 إلى 31-01-2026`.
- **Date inputs are the native `<input type="date">`** — the user explicitly preferred the native picker over a custom dd-mm-yyyy text input (a custom parsing/draft version was tried and reverted). A small `dd-mm-yyyy` hint badge sits next to each input, and the selected date is echoed back in `dd-mm-yyyy` format. One mode is active at a time — picking a date/range clears Today/Week/Year+Month and vice versa.
- **`src/features/admin/AdminDashboardPage.jsx`** — added `selectedDate / dateFrom / dateTo` state, passed to `<PeriodFilter>`, and extended `filterSalaryPaymentsByPeriod()` with the same `date`/`range` logic so the **net revenue** metric (orders − salaries) stays consistent with the visible order list.
- Frontend only — no DB/IPC changes.

---

## Feature 7 — Product Components (المكونات): Auto-Deduct Stock When an Item Is Sold

### Problem
- The `inventory` table already exists (منتجات المخزن) but **nothing consumes it** — selling 5 sandwiches never touches the bread / meat / potato counts.
- The admin wants to **link a menu item to one or more items** (inventory items, or other menu items) so every sale **automatically subtracts** the ingredients.
- Two measurement styles must be supported:
  - **Pieces (عدد):** bread 50 قطعة linked to a شاورما sandwich (uses 1) → selling 1 sandwich makes 50 − 1 = 49. Linked to a "عرض 4 ساندوتش" deal (uses 4) → selling 1 deal makes 49 − 4 = 45.
  - **Weight (وزن):** meat 10 كجم linked to a meat sandwich (uses 100 جرام) → selling 1 sandwich makes 10 كجم − 100 جرام = 9.9 كجم.

### Proposed Solution: `product_components` table + deduction inside `createOrder()`

#### New DB Table
```sql
CREATE TABLE IF NOT EXISTS product_components (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,       -- menu.id  (the item being sold)
    component_type TEXT NOT NULL,      -- 'inventory' | 'menu'
    component_id INTEGER NOT NULL,     -- inventory.id or menu.id
    usage_qty REAL NOT NULL,           -- quantity consumed per ONE sold unit
    usage_unit TEXT NOT NULL,          -- 'قطعة' | 'كجم' | 'جرام' | 'لتر' | ...
    FOREIGN KEY (product_id) REFERENCES menu(id) ON DELETE CASCADE
);
```

#### Units & Conversion Rules
- Store `usage_qty` and `usage_unit` exactly as the admin enters them.
- The **deduction engine** normalizes weight: if the inventory item's unit is `كجم` but usage was entered as `جرام`, convert grams → kg (`100 جرام → 0.1 كجم`) before subtracting. Keep a small unit map (جرام ↔ كجم, مللتر ↔ لتر).
- Piece-based items (`قطعة`) subtract as plain numbers.
- `adjustStock()` in `database.cjs` already clamps at 0 (`Math.max(0, ...)`).

#### Example (the user's exact scenarios)
| Product sold | Component | Usage | Stock math |
|---|---|---|---|
| ساندوتش شاورما (1) | خبز شاورما (قطعة) | 1 قطعة | 50 − 1 = 49 |
| عرض 4 ساندوتش (1) | خبز شاورما (قطعة) | 4 قطع | 49 − 4 = 45 |
| ساندوتش لحم (1) | لحم عجل (كجم) | 100 جرام | 10.0 − 0.1 = 9.9 كجم |

A product can have **multiple components** — e.g. ساندوتش شاورما also consumes دجاج (120 جرام) + طماطم (20 جرام) — each is a separate row in `product_components`.

#### Backend — Extend `createOrder()` (`electron/database.cjs`, line 417)
Inside the existing transaction, after inserting `order_items`, loop each sold item and deduct its components:

```js
function deductComponentsForItem(itemName, itemQty) {
    const product = db.prepare('SELECT id FROM menu WHERE name = ?').get(itemName);
    if (!product) return;                                   // no such product → skip
    const components = db.prepare(
        'SELECT * FROM product_components WHERE product_id = ?'
    ).all(product.id);

    for (const comp of components) {
        const totalUsed = comp.usage_qty * itemQty;         // scale by number sold
        const normalized = normalizeUnit(totalUsed, comp.usage_unit);
        deductFromComponent(comp.component_id, comp.component_type, normalized);
    }
}
```

> `order_items` store `item_name` as plain text, so resolve back to `menu.id` by name; if the item has no components, nothing is deducted. The deduction runs **inside the same DB transaction** as the order insert, so stock and orders never go out of sync.

#### Admin UI
- In the **قائمة الطعام (menu)** management tab, each menu item gets a **"المكونات"** editor: rows of (inventory/menu item + usage qty + unit), showing the linked item's **current stock** next to each row.
- A **low-stock warning** (⬇️) highlights a component at or below its `low_threshold`.

#### Low-Stock Decision (pick one during implementation)
1. **Block:** refuse the sale and toast "الكمية غير كافية في المخزن" — no order is created.
2. **Allow + warn:** create the order, clamp stock to 0, and toast a warning.
> Recommendation for a busy restaurant: **block** with a clear message (option 1), with an admin override per component.

---

## Feature 8 — Storage Purchases (مشتريات المخزن): Stock In + Revenue Out + Track Remaining Debt

### Problem
- When the admin buys raw material — e.g. **7 كجم بطاطس for 5,000 EGP, paying only 1,000 EGP now** — there is no way to record it.
- They need to:
  1. **Add the 7 kg to inventory** (المخزن) so it's available and counted.
  2. **Deduct the paid 1,000 EGP from revenue** — that cash has actually left the business.
  3. **Track the remaining 4,000 EGP** as debt owed to the supplier, and later settle it (deducting from revenue at that later moment).

### Proposed Solution: `purchases` + `purchase_payments` tables, integrated with revenue

#### New DB Tables
```sql
CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventory_id INTEGER,              -- optional link to inventory item
    item_name TEXT NOT NULL,           -- 'بطاطس بلدي للتحمير'
    quantity REAL NOT NULL,            -- 7
    unit TEXT NOT NULL,                -- 'كجم'
    total_cost REAL NOT NULL,          -- 5000
    balance_due REAL NOT NULL,         -- 4000 (0 when fully paid)
    purchase_date TEXT NOT NULL,       -- 'YYYY-MM-DD'
    notes TEXT DEFAULT '',
    status TEXT NOT NULL               -- 'partial' | 'paid'
);

CREATE TABLE IF NOT EXISTS purchase_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id INTEGER NOT NULL,      -- FK → purchases
    amount REAL NOT NULL,              -- each payment slice (1000, then 4000)
    payment_date TEXT NOT NULL,        -- 'YYYY-MM-DD' — drives revenue period
    FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE
);
```

> `purchase_payments` mirrors the `salary_payments` design (Feature 4): the **period-filtered net-revenue deduction** reads `purchase_payments.payment_date` — exactly like `filterSalaryPaymentsByPeriod()` in `AdminDashboardPage.jsx` already does for salaries.

#### Flow
**1. تسجيل شراء (Record purchase)** — `recordPurchase(inventoryId, itemName, quantity, unit, totalCost, amountPaid)`
- Increase `inventory.quantity` by `quantity` (if `inventoryId` is given; otherwise create the inventory item).
- Insert a `purchases` row with `balance_due = totalCost − amountPaid` and `status = 'partial'`.
- Insert a `purchase_payments` row for `amountPaid` (dated today).

**2. سداد المتبقي (Pay remaining / partial)** — `recordPurchasePayment(purchaseId, amount)`
- Insert another `purchase_payments` row (dated today).
- Decrease `purchases.balance_due` by `amount`; when it reaches 0 → `status = 'paid'`.

**3. Delete (تصحيح خطأ)** — `deletePurchase(id)`
- Removes the purchase + its payments (CASCADE) and **reverses** the inventory increase, guarded by the existing `showConfirm()` modal like all other destructive actions.

#### Revenue Integration (the important part)
- The dashboard **net revenue** metric already subtracts `salary_payments.net_pay` filtered to the selected period (Feature 4).
- Extend it to **also subtract `purchase_payments.amount` filtered to the same period** — and make sure it respects the new `date` / `range` modes from Feature 6.
- **Only amounts actually paid** are deducted. The unpaid `balance_due` is **not** counted as spent yet — that money hasn't left the business.

```
Example (July 2026):
  مبيعات يوليو                              + 30,000
  رواتب مدفوعة في يوليو                      −  8,000
  دفعات مشتريات المخزن في يوليو (1,000)      −  1,000
  ─────────────────────────────────────────────
  صافي الإيرادات (يوليو)                    = 21,000
  مستحق للمورد (لم يُدفع بعد)                =  4,000   ← ظاهر في المخزن، غير محسوم من الصافي
```

#### Admin UI — Inside the **المخزن (inventory)** Tab
Add a sub-view **"مشتريات المخزن"** next to the stock list:
- **Add purchase form:** item (existing inventory item or a new name), quantity + unit, total cost, amount paid today → auto-computes the balance.
- **Purchases list:** item, qty, total, paid so far, **المتبقي (remaining)**, date, status badge (مستحق / مدفوع).
- **سداد** button on each partial purchase → prompt for the amount, records the payment and deducts revenue at that moment.
- 🗑️ delete per row (reverses stock, keeps accounting honest).
- Summary cards: إجمالي المشتريات، المدفوع، المتبقي مستحق للموردين.

---

## Feature 9 — Printable Receipts (Customer + Kitchen)

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
Step 1 — Delete Receipt button (Backend + Admin UI)      ✅ COMPLETED
Step 2 — Revenue Period Filter (Reports Tab)             ✅ COMPLETED
Step 3 — Daily Receipt Number Reset (DB + UI)            ✅ COMPLETED
Step 4 — Salary Payment History (DB + UI)                ✅ COMPLETED
Step 5 — Link Salary deductions to Revenue period        ✅ COMPLETED
Step 6 — Receipts Tab: Date + Date-Range Filter          ✅ COMPLETED
Step 7 — Product Components: Auto-Deduct Stock           ⏳ PENDING
Step 8 — Storage Purchases + Partial Payment + Debt      ⏳ PENDING
Step 9 — Printable Receipts + Printer Config             DEFERRED (last)
```

---

## Session Polish (done alongside Feature 6)

Small non-feature improvements shipped in the same session:
- **App opens maximized (not fullscreen)** — `electron/main.cjs` calls `mainWindow.maximize()` inside `ready-to-show`, so the window fills the screen on launch (taskbar stays visible).
- **Scrollbar restyled & moved to the right** — `src/styles/index.css` adds a global emerald rounded-capsule scrollbar (16px, dark track, gradient pill thumb with glow) replacing the default white bar, plus a `.scrollbar-right` utility that forces the vertical scrollbar to the **right edge** even in RTL while keeping the content right-aligned (`direction: ltr` on the scroll container, `direction: rtl` on its children).
- `.scrollbar-right` is applied to: Admin Dashboard root, Cashier Receipts root, the POS items area + cart list (`CashierPage.jsx`), and the admin categories list (`AdminDashboardPage.jsx`).

---

## Files Impact Summary

### Files to Modify
- `src/App.jsx` — Add `receipts` view state, show nav button for cashier role
- `src/components/PeriodFilter.jsx` — ✅ `date` + `range` filter modes, controlled date/range props, dd-mm-yyyy native date inputs (Feature 6)
- `src/features/admin/AdminDashboardPage.jsx` — ✅ delete button on receipts, ✅ period filter UI, ✅ salary history section + filters + delete, ✅ net revenue respects `date`/`range` periods, **product components editor in menu tab (Feature 7)**, **storage purchases sub-view in inventory tab (Feature 8)**, net revenue also subtracts purchase payments
- `electron/database.cjs` — `deleteOrder`, `daily_number` logic in `createOrder`, `salary_payments` table + insert/get/delete functions, derived `getEmployees()` status, `getUsers`/`deleteUser`, **`product_components` table + component deduction in `createOrder()` (Feature 7)**, **`purchases`/`purchase_payments` tables + record/get/delete/settle functions (Feature 8)**
- `electron/preload.cjs` — Expose new IPC channels (`deleteOrder`, `getSalaryPayments`, `deleteSalaryPayment`, `getUsers`, `deleteUser`, **`getProductComponents`/`saveProductComponents` (Feature 7)**, **`getPurchases`/`recordPurchase`/`recordPurchasePayment`/`deletePurchase` (Feature 8)**)
- `electron/main.cjs` — ✅ `mainWindow.maximize()` on startup; register new IPC handlers for the above
- `src/styles/index.css` — ✅ global emerald capsule scrollbar + `.scrollbar-right` RTL→right utility

### Files to Create
- `src/features/cashier/CashierReceiptsPage.jsx` — Cashier-facing personal receipts view with delete
- `src/features/receipts/CustomerReceipt.jsx` — Printable customer receipt template (Feature 9, deferred)
- `src/features/receipts/KitchenReceipt.jsx` — Printable kitchen ticket template (Feature 9, deferred)
