/*
 * Backend integration tests for the Cashier App.
 * Run inside Electron because `better-sqlite3` is a native addon built for
 * Electron's Node ABI. Uses a TEMP database (never touches your real data).
 *
 *   npm test
 */
const { app } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const dbm = require('../electron/database.cjs');

let pass = 0;
let fail = 0;
const failures = [];

function ok(name, cond, extra) {
    if (cond) { pass++; console.log(`  ✓ ${name}`); }
    else { fail++; failures.push(name); console.log(`  ✗ ${name}${extra ? `  [${extra}]` : ''}`); }
}
function section(t) { console.log(`\n== ${t} ==`); }
function throws(fn) { try { fn(); return false; } catch { return true; } }

app.whenReady().then(() => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pos-tests-'));
    try {
        dbm.initDatabase(tmp);
        const invQty = (id) => dbm.getInventory().find(i => i.id === id).quantity;

        // ------------------------------ Users / auth ------------------------------ //
        section('Users & authentication');
        ok('no users initially', dbm.checkHasUsers() === false);
        ok('register admin ok', dbm.registerUser('admin', 'oldPass123', 'admin', 'لون السماء؟', 'أزرق').success === true);
        ok('user exists after register', dbm.checkHasUsers() === true);
        ok('duplicate username rejected', dbm.registerUser('ADMIN', 'x', 'cashier', 'q', 'a').success === false);
        ok('wrong password throws', throws(() => dbm.loginUser('admin', 'nope')));
        ok('correct login returns role', (() => { const u = dbm.loginUser('admin', 'oldPass123'); return u && u.role === 'admin'; })());
        ok('security question lookup', dbm.getSecurityQuestion('admin') === 'لون السماء؟');
        ok('wrong security answer throws', throws(() => dbm.resetPassword('admin', 'أحمر', 'newPass456')));
        ok('resetPassword ok', dbm.resetPassword('admin', 'أزرق', 'newPass456').success === true);
        ok('login with new password ok', dbm.loginUser('admin', 'newPass456').role === 'admin');
        ok('getUsers hides password', !('password' in dbm.getUsers()[0]));

        // ------------------------------ Categories ------------------------------ //
        section('Categories');
        const cat = dbm.addCategory('ساندوتشات');
        ok('addCategory returns id', cat.success === true && typeof cat.id === 'number');
        ok('getCategories has it', dbm.getCategories().length === 1);
        ok('deleteCategory ok', dbm.deleteCategory(cat.id).success === true && dbm.getCategories().length === 0);

        // ------------------------------ Menu ------------------------------ //
        section('Menu');
        const m = dbm.addMenuItem('Test Sandwich', 55, 'Food');
        ok('addMenuItem ok', dbm.getMenu().length === 1 && m.price === 55 && m.name === 'Test Sandwich');
        ok('deleteMenuItem ok', dbm.deleteMenuItem(m.id).success === true && dbm.getMenu().length === 0);

        // ------------------------------ Stock deduction (Feature 7) ------------------------------ //
        section('Stock / Product components');
        const bread = dbm.addInventoryItem('Test Bread', 50, 'قطعة', 10);
        const meat = dbm.addInventoryItem('Test Meat', 10, 'كجم', 3);
        const sandwich = dbm.addMenuItem('Test Sandwich', 80, 'Food');
        dbm.saveProductComponents(sandwich.id, [
            { component_type: 'inventory', component_id: bread.id, usage_qty: 1, usage_unit: 'قطعة' },
            { component_type: 'inventory', component_id: meat.id, usage_qty: 100, usage_unit: 'جرام' },
        ]);
        ok('components saved (2)', dbm.getProductComponents(sandwich.id).length === 2);

        const o1 = dbm.createOrder('ahmed', 80, [{ name: 'Test Sandwich', quantity: 1, price: 80 }]);
        ok('order daily_number 1', o1.success === true && o1.dailyNumber === 1);
        ok('piece component deducted 50→49', invQty(bread.id) === 49);
        ok('weight converted 100g→0.1kg, 10→9.9', Math.abs(invQty(meat.id) - 9.9) < 0.001);
        ok('second order daily_number 2', dbm.createOrder('ahmed', 80, [{ name: 'Test Sandwich', quantity: 1, price: 80 }]).dailyNumber === 2);
        ok('order_items stored', dbm.getOrders()[0].items.length === 1);

        // recursive deal → 4 sandwiches
        const deal = dbm.addMenuItem('Test Deal', 320, 'Offers');
        dbm.saveProductComponents(deal.id, [{ component_type: 'menu', component_id: sandwich.id, usage_qty: 4, usage_unit: 'قطعة' }]);
        dbm.createOrder('ahmed', 320, [{ name: 'Test Deal', quantity: 1, price: 320 }]);
        ok('deal recursive deducts 4 bread (48→44)', invQty(bread.id) === 44);
        ok('deal recursive deducts 4×0.1 meat (9.8→9.4)', Math.abs(invQty(meat.id) - 9.4) < 0.01);

        // blocking: 45 bread left, 60×1 needed → blocked + rolled back
        const ordersBefore = dbm.getOrders().length;
        let blockedMsg = '';
        try { dbm.createOrder('ahmed', 480, [{ name: 'Test Sandwich', quantity: 60, price: 80 }]); } catch (e) { blockedMsg = e.message; }
        ok('insufficient stock BLOCKS (60>45)', throws(() => dbm.createOrder('a', 60, [{ name: 'Test Sandwich', quantity: 60, price: 80 }])));
        ok('sale rolled back (no new order, bread stays 44)', dbm.getOrders().length === ordersBefore && invQty(bread.id) === 44);
        ok('block message human-readable (غير كافٍ)', blockedMsg && blockedMsg.includes('غير كافٍ'));

        // canceling a receipt puts the ingredients back
        const rbw = dbm.addInventoryItem('Restore Bread', 20, 'قطعة', 2);
        const rsand = dbm.addMenuItem('Restore Sandwich', 40, 'Food');
        dbm.saveProductComponents(rsand.id, [{ component_type: 'inventory', component_id: rbw.id, usage_qty: 1, usage_unit: 'قطعة' }]);
        const ro = dbm.createOrder('ahmed', 40, [{ name: 'Restore Sandwich', quantity: 1, price: 40 }]);
        ok('sell subtracts stock (20→19)', invQty(rbw.id) === 19);
        dbm.deleteOrder(ro.orderId);
        ok('cancel restores stock (19→20)', invQty(rbw.id) === 20);

        // ------------------------------ Employees / salaries (Feature 4) ------------------------------ //
        section('Employees & salary history');
        const emp = dbm.addEmployee('Sara Test', 'Cashier', 3500);
        ok('addEmployee pending', emp.payment_status === 'pending');
        const pay = dbm.togglePaymentStatus(emp.id);
        ok('toggle marks paid (net 3500)', pay.success === true && pay.paymentStatus === 'paid' && pay.netPay === 3500);
        ok('salary_payments has 1 row', dbm.getSalaryPayments().length === 1);
        ok('employee shows paid', dbm.getEmployees().find(e => e.id === emp.id).payment_status === 'paid');
        ok('cannot pay twice in same month', dbm.togglePaymentStatus(emp.id).alreadyPaidThisMonth === true);
        const payId = dbm.getSalaryPayments()[0].id;
        dbm.deleteSalaryPayment(payId);
        ok('delete payment reverts to pending', dbm.getSalaryPayments().length === 0 && dbm.getEmployees().find(e => e.id === emp.id).payment_status === 'pending');
        ok('updateSalaryParams rejects invalid field', throws(() => dbm.updateSalaryParams(emp.id, 'name', 'x')));
        ok('updateSalaryParams applies bonus', (() => { dbm.updateSalaryParams(emp.id, 'bonuses', 500); return dbm.getEmployees().find(e => e.id === emp.id).bonuses === 500; })());

        // ------------------------------ Purchases (Feature 8) ------------------------------ //
        section('Storage purchases & revenue deductions');
        const potato = dbm.addInventoryItem('Test Potato', 20, 'كجم', 5);
        dbm.recordPurchase(potato.id, 'Test Potato', 5, 'كجم', 5000, 1000, 'مورد');
        ok('purchase adds stock 20→25', invQty(potato.id) === 25);
        const p = dbm.getPurchases()[0];
        ok('purchase partial (balance 4000, paid 1000)', p.balance_due === 4000 && p.paid_amount === 1000 && p.status === 'partial');
        ok('one payment (1000)', dbm.getPurchasePayments().length === 1);
        dbm.recordPurchasePayment(p.id, 1500);
        ok('partial pay → balance 2500', dbm.getPurchases()[0].balance_due === 2500);
        dbm.recordPurchasePayment(p.id, 2500);
        ok('settled → paid (paid 5000)', (() => { const x = dbm.getPurchases()[0]; return x.status === 'paid' && x.paid_amount === 5000 && x.balance_due <= 0; })());
        ok('overpay rejected', throws(() => dbm.recordPurchasePayment(p.id, 5)));

        const newPurchase = dbm.recordPurchase(null, 'Test Butter', 10, 'صندوق', 1500, 1500, '');
        ok('new-item purchase creates inventory 10', dbm.getInventory().find(i => i.name === 'Test Butter').quantity === 10);
        dbm.deletePurchase(newPurchase.id);
        ok('delete reverses stock (0) and drops payments', dbm.getInventory().find(i => i.name === 'Test Butter').quantity <= 0 && dbm.getPurchasePayments().filter(pp => pp.purchase_id === newPurchase.id).length === 0);

        // ------------------------------ Backup / Restore (Feature 9) ------------------------------ //
        section('Backup & restore');
        const backupPath = path.join(tmp, 'pos_test_backup.db');
        ok('getDatabasePath points at pos_database.db', path.basename(dbm.getDatabasePath()) === 'pos_database.db');
        const menuCountBefore = dbm.getMenu().length;
        // simulate backup
        dbm.closeDatabase();
        fs.copyFileSync(dbm.getDatabasePath(), backupPath);
        dbm.openDatabase();
        ok('backup file created (real bytes)', fs.existsSync(backupPath) && fs.statSync(backupPath).size > 0);
        // mutate live db
        dbm.addMenuItem('PostBackup Item', 5, 'Food');
        ok('live db changed after backup', dbm.getMenu().length === menuCountBefore + 1);
        // restore = copy backup back over pos_database.db, then reopen
        dbm.closeDatabase();
        fs.copyFileSync(backupPath, dbm.getDatabasePath());
        dbm.openDatabase();
        ok('restore brings back the pre-backup menu', dbm.getMenu().length === menuCountBefore && !dbm.getMenu().some(i => i.name === 'PostBackup Item'));
        ok('reopened DB still writable', typeof dbm.addMenuItem('AfterRestore Item', 9, 'Food').id === 'number');
    }
    catch (err) {
        fail++;
        failures.push('FATAL: ' + err.message);
        console.error('\nFATAL ERROR in tests:\n', err);
    } finally {
        try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* DB still open; temp dir may linger — harmless */ }
    }

    if (fail === 0) {
        console.log(`\nALL TESTS PASSED — ${pass} checks`);
    } else {
        console.log(`\n${pass} passed / ${fail} FAILED`);
        console.log(failures.join('\n'));
        process.exitCode = 1;
    }
    app.quit();
});