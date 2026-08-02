const Database = require('better-sqlite3');
const path = require('path');

let db;

function initDatabase(userDataPath) {
    const dbPath = path.join(userDataPath, 'pos_database.db');
    db = new Database(dbPath);

    // Create Tables
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL,
            security_question TEXT NOT NULL,
            security_answer TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL
        );

        CREATE TABLE IF NOT EXISTS menu (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            price REAL NOT NULL,
            category TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            quantity REAL NOT NULL,
            unit TEXT NOT NULL,
            low_threshold REAL NOT NULL
        );

        CREATE TABLE IF NOT EXISTS employees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            role TEXT NOT NULL,
            base_salary REAL NOT NULL,
            bonuses REAL DEFAULT 0,
            deductions REAL DEFAULT 0,
            payment_status TEXT NOT NULL,
            last_payment_date TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cashier TEXT NOT NULL,
            total REAL NOT NULL,
            timestamp TEXT NOT NULL,
            daily_number INTEGER DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            item_name TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            price REAL NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
        );

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

        CREATE TABLE IF NOT EXISTS product_components (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,       -- menu.id  (the item being sold)
            component_type TEXT NOT NULL,      -- 'inventory' | 'menu'
            component_id INTEGER NOT NULL,     -- inventory.id or menu.id
            usage_qty REAL NOT NULL,           -- quantity consumed per ONE sold unit
            usage_unit TEXT NOT NULL,          -- 'قطعة' | 'كجم' | 'جرام' | 'لتر' | 'مللتر' | 'صندوق'
            FOREIGN KEY (product_id) REFERENCES menu(id) ON DELETE CASCADE
        );

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
    `);

    // Migration: check if daily_number column exists in orders table
    const tableInfo = db.prepare("PRAGMA table_info(orders)").all();
    const hasDailyNumber = tableInfo.some(col => col.name === 'daily_number');
    if (!hasDailyNumber) {
        db.exec("ALTER TABLE orders ADD COLUMN daily_number INTEGER DEFAULT 1;");
    }

    // Recalculate daily_number using local calendar date for all orders
    recalculateDailyNumbers();

    // Seed inventory with default items if empty
    const checkInventory = db.prepare('SELECT count(*) as count FROM inventory').get();
    if (checkInventory.count === 0) {
        const seedItems = [
            { name: 'خبز شاورما طازج', quantity: 120, unit: 'قطعة', low_threshold: 35 },
            { name: 'لحم عجل مبرد (شاورما)', quantity: 25, unit: 'كجم', low_threshold: 8 },
            { name: 'صدور دجاج طازجة', quantity: 42, unit: 'كجم', low_threshold: 10 },
            { name: 'بطاطس بلدي للتحمير', quantity: 50, unit: 'كجم', low_threshold: 15 },
            { name: 'زيت ذرة نقي للقلي', quantity: 18, unit: 'لتر', low_threshold: 6 },
            { name: 'طماطم طازجة للسلطة', quantity: 5, unit: 'كجم', low_threshold: 10 }
        ];

        const insertInv = db.prepare(`
            INSERT INTO inventory (name, quantity, unit, low_threshold)
            VALUES (@name, @quantity, @unit, @low_threshold)
        `);

        const insertTransaction = db.transaction((items) => {
            for (const item of items) {
                insertInv.run(item);
            }
        });
        insertTransaction(seedItems);
    }
}

function getLocalDateString(d = new Date()) {
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return 'unknown';
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

const ARABIC_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

function recalculateDailyNumbers() {
    if (!db) return;
    const allOrders = db.prepare("SELECT id, timestamp FROM orders ORDER BY timestamp ASC, id ASC").all();
    const ordersByDate = {};
    for (const ord of allOrders) {
        const dateStr = getLocalDateString(ord.timestamp);
        if (!ordersByDate[dateStr]) {
            ordersByDate[dateStr] = 0;
        }
        ordersByDate[dateStr] += 1;
        db.prepare("UPDATE orders SET daily_number = ? WHERE id = ?").run(ordersByDate[dateStr], ord.id);
    }
}

// --- DB Operations: Users ---
function checkHasUsers() {
    const row = db.prepare('SELECT count(*) as count FROM users').get();
    return row.count > 0;
}

function registerUser(username, password, role, securityQuestion, securityAnswer) {
    try {
        const insert = db.prepare(`
            INSERT INTO users (username, password, role, security_question, security_answer)
            VALUES (?, ?, ?, ?, ?)
        `);
        insert.run(username.trim().toLowerCase(), password, role, securityQuestion, securityAnswer);
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

function loginUser(username, password) {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim().toLowerCase());
    if (!user) {
        throw new Error('اسم المستخدم غير مسجل');
    }
    if (user.password !== password) {
        throw new Error('كلمة المرور غير صحيحة');
    }
    return {
        username: user.username,
        role: user.role
    };
}

function getSecurityQuestion(username) {
    const user = db.prepare('SELECT security_question FROM users WHERE username = ?').get(username.trim().toLowerCase());
    if (!user) {
        throw new Error('اسم المستخدم غير مسجل');
    }
    return user.security_question;
}

function resetPassword(username, securityAnswer, newPassword) {
    const user = db.prepare('SELECT security_answer FROM users WHERE username = ?').get(username.trim().toLowerCase());
    if (!user) {
        throw new Error('اسم المستخدم غير مسجل');
    }
    if (user.security_answer.trim().toLowerCase() !== securityAnswer.trim().toLowerCase()) {
        throw new Error('إجابة سؤال الأمان غير صحيحة');
    }
    db.prepare('UPDATE users SET password = ? WHERE username = ?').run(newPassword, username.trim().toLowerCase());
    return { success: true };
}

function getUsers() {
    // Only expose safe fields — never passwords or security answers
    return db.prepare('SELECT id, username, role FROM users ORDER BY id ASC').all();
}

function deleteUser(id, currentUsername) {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) throw new Error('المستخدم غير مسجل');
    if (user.username === currentUsername) {
        throw new Error('لا يمكن حذف حسابك الحالي أثناء تسجيل الدخول');
    }
    const admins = db.prepare('SELECT COUNT(*) as cnt FROM users WHERE role = ?').get('admin');
    if (user.role === 'admin' && admins.cnt <= 1) {
        throw new Error('لا يمكن حذف آخر حساب مدير في النظام');
    }
    // orders.cashier stores the username as plain text (no FK), so the cashier's
    // receipts/records are preserved automatically when the account is removed.
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return { success: true };
}

// --- DB Operations: Categories ---
function getCategories() {
    return db.prepare('SELECT * FROM categories ORDER BY id ASC').all();
}

function addCategory(name) {
    try {
        const info = db.prepare('INSERT INTO categories (name) VALUES (?)').run(name.trim());
        return { success: true, id: info.lastInsertRowid, name: name.trim() };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

function deleteCategory(id) {
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    return { success: true };
}

// --- DB Operations: Menu ---
function getMenu() {
    return db.prepare('SELECT * FROM menu').all();
}

function addMenuItem(name, price, category) {
    const info = db.prepare(`
        INSERT INTO menu (name, price, category)
        VALUES (?, ?, ?)
    `).run(name, price, category);
    return {
        id: info.lastInsertRowid,
        name,
        price,
        category
    };
}

function deleteMenuItem(id) {
    db.prepare('DELETE FROM menu WHERE id = ?').run(id);
    return { success: true };
}

// --- DB Operations: Inventory ---
function getInventory() {
    return db.prepare('SELECT * FROM inventory').all();
}

function addInventoryItem(name, quantity, unit, lowThreshold) {
    const info = db.prepare(`
        INSERT INTO inventory (name, quantity, unit, low_threshold)
        VALUES (?, ?, ?, ?)
    `).run(name, quantity, unit, lowThreshold);
    return {
        id: info.lastInsertRowid,
        name,
        quantity,
        unit,
        low_threshold: lowThreshold
    };
}

function adjustStock(id, amount) {
    const item = db.prepare('SELECT quantity FROM inventory WHERE id = ?').get(id);
    if (!item) throw new Error('الصنف غير موجود في المخزن');
    const newQty = Math.max(0, item.quantity + amount);
    db.prepare('UPDATE inventory SET quantity = ? WHERE id = ?').run(newQty, id);
    return { success: true, newQuantity: newQty };
}

function deleteInventoryItem(id) {
    db.prepare('DELETE FROM inventory WHERE id = ?').run(id);
    return { success: true };
}

// --- DB Operations: Employees ---
function getEmployees() {
    const employees = db.prepare('SELECT * FROM employees ORDER BY id ASC').all();
    const currentMonthPrefix = getLocalDateString().slice(0, 7);

    // Payment status is derived from the salary_payments history: an employee is
    // "paid" only if they have a payment record in the current month. This
    // automatically resets everyone to "pending" at the start of each new month.
    const payments = db.prepare('SELECT employee_id, payment_date FROM salary_payments ORDER BY payment_date DESC').all();
    const paidThisMonth = new Set();
    const latestPaymentByEmployee = {};
    for (const p of payments) {
        if (p.employee_id !== null && !(p.employee_id in latestPaymentByEmployee)) {
            latestPaymentByEmployee[p.employee_id] = p.payment_date;
        }
        if (p.payment_date && p.payment_date.startsWith(currentMonthPrefix)) {
            paidThisMonth.add(p.employee_id);
        }
    }

    return employees.map(emp => ({
        ...emp,
        payment_status: paidThisMonth.has(emp.id) ? 'paid' : 'pending',
        last_payment_date: latestPaymentByEmployee[emp.id] || '-'
    }));
}

function addEmployee(name, role, baseSalary) {
    const info = db.prepare(`
        INSERT INTO employees (name, role, base_salary, bonuses, deductions, payment_status, last_payment_date)
        VALUES (?, ?, ?, 0, 0, 'pending', '-')
    `).run(name, role, baseSalary);
    return {
        id: info.lastInsertRowid,
        name,
        role,
        base_salary: baseSalary,
        bonuses: 0,
        deductions: 0,
        payment_status: 'pending',
        last_payment_date: '-'
    };
}

function updateSalaryParams(id, field, value) {
    // Valid fields to prevent raw queries injections
    const validFields = ['base_salary', 'bonuses', 'deductions'];
    if (!validFields.includes(field)) throw new Error('حقل غير صالح للتحديث');
    db.prepare(`UPDATE employees SET ${field} = ? WHERE id = ?`).run(value, id);
    return { success: true };
}

function recordSalaryPayment(employeeId, employeeName, baseSalary, bonuses, deductions, netPay, monthLabel) {
    const date = getLocalDateString();
    db.prepare(`
        INSERT INTO salary_payments 
        (employee_id, employee_name, base_salary, bonuses, deductions, net_pay, payment_date, month_label)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(employeeId, employeeName, baseSalary, bonuses, deductions, netPay, date, monthLabel);
    return { success: true };
}

function getSalaryPayments() {
    return db.prepare(`
        SELECT sp.*, e.role AS employee_role
        FROM salary_payments sp
        LEFT JOIN employees e ON e.id = sp.employee_id
        ORDER BY sp.payment_date DESC, sp.id DESC
    `).all();
}

function deleteSalaryPayment(id) {
    db.prepare('DELETE FROM salary_payments WHERE id = ?').run(id);
    return { success: true };
}

function togglePaymentStatus(id) {
    const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
    if (!emp) throw new Error('الموظف غير مسجل');

    const now = new Date();
    const currentMonthPrefix = getLocalDateString(now).slice(0, 7);

    // Prevent paying the same employee twice in the same calendar month.
    const existing = db.prepare('SELECT id FROM salary_payments WHERE employee_id = ? AND payment_date LIKE ?')
        .get(emp.id, currentMonthPrefix + '%');
    if (existing) {
        return {
            success: true,
            alreadyPaidThisMonth: true,
            paymentStatus: 'paid',
            bonuses: emp.bonuses,
            deductions: emp.deductions
        };
    }

    // Marking as paid — snapshot the salary and reset bonuses/deductions for the next cycle
    const dateStr = getLocalDateString(now);
    const monthLabel = `${ARABIC_MONTHS[now.getMonth()]} ${now.getFullYear()}`;
    const netPay = emp.base_salary + emp.bonuses - emp.deductions;

    const tx = db.transaction(() => {
        recordSalaryPayment(emp.id, emp.name, emp.base_salary, emp.bonuses, emp.deductions, netPay, monthLabel);
        db.prepare('UPDATE employees SET last_payment_date = ?, bonuses = 0, deductions = 0 WHERE id = ?')
            .run(dateStr, id);
    });
    tx();

    return {
        success: true,
        alreadyPaidThisMonth: false,
        paymentStatus: 'paid',
        lastPaymentDate: dateStr,
        bonuses: 0,
        deductions: 0,
        netPay
    };
}

function deleteEmployee(id) {
    db.prepare('DELETE FROM employees WHERE id = ?').run(id);
    return { success: true };
}

// --- DB Operations: Product Components (المكونات) ---
const GRAMS_PER_UNIT = { 'جرام': 1, 'كجم': 1000 };
const ML_PER_UNIT = { 'مللتر': 1, 'لتر': 1000 };

// Convert a usage amount (usageQty in usageUnit) into the item's own unit (targetUnit).
// Example: 100 'جرام' → item unit 'كجم' = 0.1. Unknown pairs pass through unchanged.
function normalizeUsage(usageQty, usageUnit, targetUnit) {
    if (!usageQty) return 0;
    if (!usageUnit || !targetUnit || usageUnit === targetUnit) return usageQty;

    const g1 = GRAMS_PER_UNIT[usageUnit];
    const g2 = GRAMS_PER_UNIT[targetUnit];
    if (g1 && g2) return (usageQty * g1) / g2;

    const v1 = ML_PER_UNIT[usageUnit];
    const v2 = ML_PER_UNIT[targetUnit];
    if (v1 && v2) return (usageQty * v1) / v2;

    return usageQty;
}

function getProductComponents(productId) {
    return db.prepare('SELECT * FROM product_components WHERE product_id = ? ORDER BY id ASC').all(productId);
}

// Replace-all save: deletes the product's current rows and inserts the provided list.
function saveProductComponents(productId, components) {
    const del = db.prepare('DELETE FROM product_components WHERE product_id = ?');
    const ins = db.prepare(`
        INSERT INTO product_components (product_id, component_type, component_id, usage_qty, usage_unit)
        VALUES (?, ?, ?, ?, ?)
    `);

    const tx = db.transaction((pid, comps) => {
        del.run(pid);
        for (const c of comps) {
            if (!c || !c.component_type || !c.component_id) continue;
            ins.run(pid, c.component_type, c.component_id, Number(c.usage_qty) || 0, c.usage_unit || '');
        }
    });

    tx(productId, components || []);
    return { success: true };
}

// Expand a product's components (recursively through 'menu'-type links) into a flat
// list of inventory deductions. depth guard prevents infinite loops on circular links.
function collectInventoryDeductions(productId, factor, depth, acc) {
    if (depth > 5) return acc;
    const components = db.prepare('SELECT * FROM product_components WHERE product_id = ?').all(productId);
    for (const comp of components) {
        if (comp.component_type === 'inventory') {
            acc.push({ inventoryId: comp.component_id, totalUsed: comp.usage_qty * factor, usageUnit: comp.usage_unit });
        } else if (comp.component_type === 'menu') {
            collectInventoryDeductions(comp.component_id, comp.usage_qty * factor, depth + 1, acc);
        }
    }
    return acc;
}

// Deduct the sold item's components from inventory. Throws when stock would go below
// zero — the caller wraps this in the order transaction so the sale is rolled back.
function deductComponents(itemName, itemQty) {
    const product = db.prepare('SELECT id FROM menu WHERE name = ?').get(itemName);
    if (!product) return;

    const deductions = collectInventoryDeductions(product.id, itemQty, 0, []);
    if (deductions.length === 0) return;

    const updateInv = db.prepare('UPDATE inventory SET quantity = ? WHERE id = ?');
    for (const d of deductions) {
        const inv = db.prepare('SELECT id, name, quantity, unit FROM inventory WHERE id = ?').get(d.inventoryId);
        if (!inv) continue;

        const totalUsed = normalizeUsage(d.totalUsed, d.usageUnit, inv.unit);
        if (!totalUsed) continue;

        const newQty = inv.quantity - totalUsed;
        if (newQty < -0.0001) {
            throw new Error(
                `عذراً، لا يمكن إتمام البيع — مخزون "${inv.name}" غير كافٍ. المطلوب: ${Number(totalUsed.toFixed(3))} ${inv.unit}، المتاح في المخزن: ${Number(inv.quantity.toFixed(3))} ${inv.unit} فقط. يرجى إبلاغ الإدارة لإعادة التعبئة.`
            );
        }
        updateInv.run(newQty, inv.id);
    }
}

// Reverse of deductComponents(): add back the consumed ingredients when a receipt is
// deleted/cancelled. Uses the same recursive expansion + unit normalization.
function restoreComponentsForItem(itemName, itemQty) {
    const product = db.prepare('SELECT id FROM menu WHERE name = ?').get(itemName);
    if (!product) return;

    const deductions = collectInventoryDeductions(product.id, itemQty, 0, []);
    if (deductions.length === 0) return;

    const updateInv = db.prepare('UPDATE inventory SET quantity = quantity + ? WHERE id = ?');
    for (const d of deductions) {
        const inv = db.prepare('SELECT id, unit FROM inventory WHERE id = ?').get(d.inventoryId);
        if (!inv) continue;
        const toAdd = normalizeUsage(d.totalUsed, d.usageUnit, inv.unit);
        if (!toAdd) continue;
        updateInv.run(toAdd, inv.id);
    }
}

// --- DB Operations: Storage Purchases (مشتريات المخزن) ---
function getPurchases() {
    return db.prepare(`
        SELECT p.*, (p.total_cost - p.balance_due) AS paid_amount
        FROM purchases p
        ORDER BY p.purchase_date DESC, p.id DESC
    `).all();
}

function getPurchasePayments() {
    return db.prepare('SELECT * FROM purchase_payments ORDER BY payment_date DESC, id DESC').all();
}

// Record a raw-material purchase: increases inventory stock, stores the total cost,
// records the amount actually paid today, and tracks the remaining balance as debt.
function recordPurchase(inventoryId, itemName, quantity, unit, totalCost, amountPaid, notes) {
    const date = getLocalDateString();
    const qty = Number(quantity) || 0;
    const cost = Number(totalCost) || 0;
    const paid = Math.min(Math.max(Number(amountPaid) || 0, 0), cost);
    const balance = Math.max(0, cost - paid);

    const tx = db.transaction(() => {
        let invId = Number(inventoryId) || null;
        let createdNew = false;

        if (!invId) {
            // New item, or a name that matches an existing inventory item
            const existing = db.prepare('SELECT id FROM inventory WHERE name = ?').get(itemName);
            if (existing) {
                invId = existing.id;
            } else {
                const info = db.prepare(
                    'INSERT INTO inventory (name, quantity, unit, low_threshold) VALUES (?, ?, ?, ?)'
                ).run(itemName, qty, unit || 'قطعة', 0);
                invId = info.lastInsertRowid;
                createdNew = true;
            }
        }

        // Increase stock (the brand-new item was already created with the full quantity)
        if (!createdNew && qty > 0) {
            db.prepare('UPDATE inventory SET quantity = quantity + ? WHERE id = ?').run(qty, invId);
        }

        const info = db.prepare(`
            INSERT INTO purchases (inventory_id, item_name, quantity, unit, total_cost, balance_due, purchase_date, notes, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(invId, itemName || 'مادة خام', qty, unit || 'قطعة', cost, balance, date, notes || '', balance > 0 ? 'partial' : 'paid');

        const purchaseId = info.lastInsertRowid;

        // Money actually paid leaves the business now → becomes a revenue deduction
        if (paid > 0) {
            db.prepare('INSERT INTO purchase_payments (purchase_id, amount, payment_date) VALUES (?, ?, ?)')
                .run(purchaseId, paid, date);
        }

        return { success: true, id: purchaseId };
    });

    return tx();
}

// Pay the remaining (or partial) balance of a purchase; the payment is dated today
// so it joins the period-filtered revenue deduction.
function recordPurchasePayment(purchaseId, amount) {
    const purchase = db.prepare('SELECT * FROM purchases WHERE id = ?').get(purchaseId);
    if (!purchase) throw new Error('عملية الشراء غير موجودة');

    const payAmount = Number(amount) || 0;
    if (payAmount <= 0) throw new Error('أدخل مبلغاً صحيحاً');
    if (payAmount > purchase.balance_due + 0.0001) {
        throw new Error(`المبلغ أكبر من المتبقي (${Number(purchase.balance_due.toFixed(2))} جنية)`);
    }

    const date = getLocalDateString();
    const tx = db.transaction(() => {
        db.prepare('INSERT INTO purchase_payments (purchase_id, amount, payment_date) VALUES (?, ?, ?)')
            .run(purchaseId, payAmount, date);
        const newBalance = Math.max(0, purchase.balance_due - payAmount);
        db.prepare('UPDATE purchases SET balance_due = ?, status = ? WHERE id = ?')
            .run(newBalance, newBalance > 0 ? 'partial' : 'paid', purchaseId);
        return { success: true, balance_due: newBalance };
    });
    return tx();
}

// Delete a purchase (and its payments via CASCADE), reversing the stock increase.
// Revenue deductions disappear automatically since they come from purchase_payments.
function deletePurchase(id) {
    const purchase = db.prepare('SELECT * FROM purchases WHERE id = ?').get(id);
    if (!purchase) return { success: true };

    const tx = db.transaction(() => {
        if (purchase.inventory_id) {
            const inv = db.prepare('SELECT quantity FROM inventory WHERE id = ?').get(purchase.inventory_id);
            if (inv) {
                const newQty = Math.max(0, inv.quantity - (purchase.quantity || 0));
                db.prepare('UPDATE inventory SET quantity = ? WHERE id = ?').run(newQty, purchase.inventory_id);
            }
        }
        db.prepare('DELETE FROM purchases WHERE id = ?').run(id);
        return { success: true };
    });
    return tx();
}

function createOrder(cashier, total, items) {
    const now = new Date();
    const timestamp = now.toISOString();
    const todayLocalDate = getLocalDateString(now);

    // Count how many orders already exist today in local time
    const allOrders = db.prepare("SELECT timestamp FROM orders").all();
    const todayCount = allOrders.filter(o => getLocalDateString(o.timestamp) === todayLocalDate).length;
    const dailyNumber = todayCount + 1;

    const insertOrder = db.prepare('INSERT INTO orders (cashier, total, timestamp, daily_number) VALUES (?, ?, ?, ?)');
    const insertItem = db.prepare('INSERT INTO order_items (order_id, item_name, quantity, price) VALUES (?, ?, ?, ?)');

    const transaction = db.transaction((cashierName, orderTotal, orderItems) => {
        const info = insertOrder.run(cashierName, orderTotal, timestamp, dailyNumber);
        const orderId = info.lastInsertRowid;
        for (const item of orderItems) {
            insertItem.run(orderId, item.name, item.quantity, item.price);
            // Consume ingredients from storage — throws (and rolls back) if stock is insufficient
            deductComponents(item.name, item.quantity);
        }
        return { success: true, orderId, dailyNumber };
    });

    return transaction(cashier, total, items);
}

function getOrders() {
    const orders = db.prepare('SELECT * FROM orders ORDER BY timestamp DESC').all();
    return orders.map(order => {
        const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
        return {
            ...order,
            items
        };
    });
}

function deleteOrder(id) {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);

    const tx = db.transaction(() => {
        // Canceling a receipt must give the ingredients back to the stock, exactly
        // mirroring the deduction that deductComponents() applied when it was sold.
        if (order) {
            const items = db.prepare('SELECT item_name, quantity FROM order_items WHERE order_id = ?').all(id);
            for (const item of items) {
                restoreComponentsForItem(item.item_name, item.quantity);
            }
        }
        db.prepare('DELETE FROM orders WHERE id = ?').run(id);
        return { success: true };
    });

    return tx();
}

module.exports = {
    initDatabase,
    checkHasUsers,
    registerUser,
    loginUser,
    getSecurityQuestion,
    resetPassword,
    getUsers,
    deleteUser,
    getCategories,
    addCategory,
    deleteCategory,
    getMenu,
    addMenuItem,
    deleteMenuItem,
    getInventory,
    addInventoryItem,
    adjustStock,
    deleteInventoryItem,
    getEmployees,
    addEmployee,
    updateSalaryParams,
    togglePaymentStatus,
    deleteEmployee,
    recordSalaryPayment,
    getSalaryPayments,
    deleteSalaryPayment,
    getProductComponents,
    saveProductComponents,
    getPurchases,
    getPurchasePayments,
    recordPurchase,
    recordPurchasePayment,
    deletePurchase,
    createOrder,
    getOrders,
    deleteOrder
};
