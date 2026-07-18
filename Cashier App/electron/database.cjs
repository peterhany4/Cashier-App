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
            timestamp TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            item_name TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            price REAL NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
        );
    `);

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
    return db.prepare('SELECT * FROM employees').all();
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

function togglePaymentStatus(id) {
    const emp = db.prepare('SELECT payment_status FROM employees WHERE id = ?').get(id);
    if (!emp) throw new Error('الموظف غير مسجل');
    const newStatus = emp.payment_status === 'paid' ? 'pending' : 'paid';
    const dateStr = newStatus === 'paid' ? new Date().toISOString().split('T')[0] : '-';
    db.prepare(`
        UPDATE employees 
        SET payment_status = ?, last_payment_date = ? 
        WHERE id = ?
    `).run(newStatus, dateStr, id);
    return { success: true, paymentStatus: newStatus, lastPaymentDate: dateStr };
}

function deleteEmployee(id) {
    db.prepare('DELETE FROM employees WHERE id = ?').run(id);
    return { success: true };
}

function createOrder(cashier, total, items) {
    const timestamp = new Date().toISOString();
    const insertOrder = db.prepare('INSERT INTO orders (cashier, total, timestamp) VALUES (?, ?, ?)');
    const insertItem = db.prepare('INSERT INTO order_items (order_id, item_name, quantity, price) VALUES (?, ?, ?, ?)');

    const transaction = db.transaction((cashierName, orderTotal, orderItems) => {
        const info = insertOrder.run(cashierName, orderTotal, timestamp);
        const orderId = info.lastInsertRowid;
        for (const item of orderItems) {
            insertItem.run(orderId, item.name, item.quantity, item.price);
        }
        return { success: true, orderId };
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

module.exports = {
    initDatabase,
    checkHasUsers,
    registerUser,
    loginUser,
    getSecurityQuestion,
    resetPassword,
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
    createOrder,
    getOrders
};
