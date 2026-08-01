const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
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

    // Show window only when content is fully rendered
    mainWindow.once('ready-to-show', () => {
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

    ipcMain.handle('db:createOrder', async (event, cashier, total, items) => {
        return dbModule.createOrder(cashier, total, items);
    });

    ipcMain.handle('db:getOrders', async () => {
        return dbModule.getOrders();
    });

    ipcMain.handle('db:deleteOrder', async (event, id) => {
        return dbModule.deleteOrder(id);
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
