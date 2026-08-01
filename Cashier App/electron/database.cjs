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
    db.prepare('DELETE FROM orders WHERE id = ?').run(id);
    return { success: true };
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
    createOrder,
    getOrders,
    deleteOrder
};
