const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const dbModule = require('./database.cjs');

const isDev = process.env.NODE_ENV === 'development';
let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 1024,
        minHeight: 768,
        show: false,          // Hide until ready to prevent white flash
        backgroundColor: '#0f172a', // Matches Tailwind bg-slate-900 (app's background)
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false
        },
        autoHideMenuBar: true
    });

    // Show window only when content is fully rendered (maximized to fill the screen, not fullscreen)
    mainWindow.once('ready-to-show', () => {
        mainWindow.maximize();
        mainWindow.show();
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        // Open DevTools in dev mode
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// IPC Handlers mapping React frontend calls to SQLite queries
function registerIpcHandlers() {
    ipcMain.handle('db:checkHasUsers', async () => {
        return dbModule.checkHasUsers();
    });

    ipcMain.handle('db:registerUser', async (event, username, password, role, securityQuestion, securityAnswer) => {
        return dbModule.registerUser(username, password, role, securityQuestion, securityAnswer);
    });

    ipcMain.handle('db:loginUser', async (event, username, password) => {
        return dbModule.loginUser(username, password);
    });

    ipcMain.handle('db:getSecurityQuestion', async (event, username) => {
        return dbModule.getSecurityQuestion(username);
    });

    ipcMain.handle('db:resetPassword', async (event, username, securityAnswer, newPassword) => {
        return dbModule.resetPassword(username, securityAnswer, newPassword);
    });

    ipcMain.handle('db:getUsers', async () => {
        return dbModule.getUsers();
    });

    ipcMain.handle('db:deleteUser', async (event, id, currentUsername) => {
        return dbModule.deleteUser(id, currentUsername);
    });

    ipcMain.handle('db:getMenu', async () => {
        return dbModule.getMenu();
    });

    ipcMain.handle('db:addMenuItem', async (event, name, price, category) => {
        return dbModule.addMenuItem(name, price, category);
    });

    ipcMain.handle('db:deleteMenuItem', async (event, id) => {
        return dbModule.deleteMenuItem(id);
    });

    ipcMain.handle('db:getCategories', async () => {
        return dbModule.getCategories();
    });

    ipcMain.handle('db:addCategory', async (event, name) => {
        return dbModule.addCategory(name);
    });

    ipcMain.handle('db:deleteCategory', async (event, id) => {
        return dbModule.deleteCategory(id);
    });

    ipcMain.handle('db:getInventory', async () => {
        return dbModule.getInventory();
    });

    ipcMain.handle('db:addInventoryItem', async (event, name, quantity, unit, lowThreshold) => {
        return dbModule.addInventoryItem(name, quantity, unit, lowThreshold);
    });

    ipcMain.handle('db:adjustStock', async (event, id, amount) => {
        return dbModule.adjustStock(id, amount);
    });

    ipcMain.handle('db:deleteInventoryItem', async (event, id) => {
        return dbModule.deleteInventoryItem(id);
    });

    ipcMain.handle('db:getEmployees', async () => {
        return dbModule.getEmployees();
    });

    ipcMain.handle('db:addEmployee', async (event, name, role, baseSalary) => {
        return dbModule.addEmployee(name, role, baseSalary);
    });

    ipcMain.handle('db:updateSalaryParams', async (event, id, field, value) => {
        return dbModule.updateSalaryParams(id, field, value);
    });

    ipcMain.handle('db:togglePaymentStatus', async (event, id) => {
        return dbModule.togglePaymentStatus(id);
    });

    ipcMain.handle('db:deleteEmployee', async (event, id) => {
        return dbModule.deleteEmployee(id);
    });

    ipcMain.handle('db:getSalaryPayments', async () => {
        return dbModule.getSalaryPayments();
    });

    ipcMain.handle('db:deleteSalaryPayment', async (event, id) => {
        return dbModule.deleteSalaryPayment(id);
    });

    ipcMain.handle('db:getProductComponents', async (event, productId) => {
        return dbModule.getProductComponents(productId);
    });

    ipcMain.handle('db:saveProductComponents', async (event, productId, components) => {
        return dbModule.saveProductComponents(productId, components);
    });

    ipcMain.handle('db:getPurchases', async () => {
        return dbModule.getPurchases();
    });

    ipcMain.handle('db:getPurchasePayments', async () => {
        return dbModule.getPurchasePayments();
    });

    ipcMain.handle('db:recordPurchase', async (event, inventoryId, itemName, quantity, unit, totalCost, amountPaid, notes) => {
        return dbModule.recordPurchase(inventoryId, itemName, quantity, unit, totalCost, amountPaid, notes);
    });

    ipcMain.handle('db:recordPurchasePayment', async (event, purchaseId, amount) => {
        return dbModule.recordPurchasePayment(purchaseId, amount);
    });

    ipcMain.handle('db:deletePurchase', async (event, id) => {
        return dbModule.deletePurchase(id);
    });

    ipcMain.handle('db:createOrder', async (event, cashier, total, items) => {
        return dbModule.createOrder(cashier, total, items);
    });

    ipcMain.handle('db:getOrders', async () => {
        return dbModule.getOrders();
    });

    ipcMain.handle('db:deleteOrder', async (event, id) => {
        return dbModule.deleteOrder(id);
    });

    ipcMain.handle('db:backupDatabase', async (event) => {
        const dbPath = dbModule.getDatabasePath();
        if (!dbPath) return { success: false, canceled: true, error: 'DB not initialized' };

        const today = new Date().toISOString().slice(0, 10);
        const result = await dialog.showSaveDialog(mainWindow, {
            title: 'حفظ نسخة احتياطية من قاعدة البيانات',
            defaultPath: `pos_database_backup_${today}.db`,
            filters: [{ name: 'قاعدة بيانات', extensions: ['db'] }]
        });

        if (result.canceled || !result.filePath) return { success: false, canceled: true };
        const dest = result.filePath;

        try {
            dbModule.closeDatabase();
            fs.copyFileSync(dbPath, dest);
            return { success: true, destPath: dest };
        } catch (err) {
            return { success: false, error: err.message };
        } finally {
            dbModule.openDatabase();
        }
    });

    ipcMain.handle('db:restoreDatabase', async (event) => {
        const dbPath = dbModule.getDatabasePath();
        if (!dbPath) return { success: false, canceled: true, error: 'DB not initialized' };

        const result = await dialog.showOpenDialog(mainWindow, {
            title: 'اختر النسخة الاحتياطية لاستعادتها',
            filters: [{ name: 'قاعدة بيانات', extensions: ['db'] }],
            properties: ['openFile']
        });

        if (result.canceled || !result.filePaths || !result.filePaths[0]) {
            return { success: false, canceled: true };
        }
        const src = result.filePaths[0];

        try {
            dbModule.closeDatabase();
            fs.copyFileSync(src, dbPath);
            dbModule.openDatabase();
            // Notify the renderer that data changed so it can re-fetch everything.
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('db:databaseRestored');
            }
            return { success: true };
        } catch (err) {
            try { dbModule.openDatabase(); } catch (_) { /* keep original error */ }
            return { success: false, error: err.message };
        }
    });
}

app.whenReady().then(() => {
    // Init SQLite database in app user data directory
    dbModule.initDatabase(app.getPath('userData'));

    registerIpcHandlers();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
