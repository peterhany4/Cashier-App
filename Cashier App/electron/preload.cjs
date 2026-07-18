const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    db: {
        checkHasUsers: () => ipcRenderer.invoke('db:checkHasUsers'),
        registerUser: (username, password, role, securityQuestion, securityAnswer) => 
            ipcRenderer.invoke('db:registerUser', username, password, role, securityQuestion, securityAnswer),
        loginUser: (username, password) => ipcRenderer.invoke('db:loginUser', username, password),
        getSecurityQuestion: (username) => ipcRenderer.invoke('db:getSecurityQuestion', username),
        resetPassword: (username, securityAnswer, newPassword) => 
            ipcRenderer.invoke('db:resetPassword', username, securityAnswer, newPassword),
        
        getMenu: () => ipcRenderer.invoke('db:getMenu'),
        addMenuItem: (name, price, category) => ipcRenderer.invoke('db:addMenuItem', name, price, category),
        deleteMenuItem: (id) => ipcRenderer.invoke('db:deleteMenuItem', id),

        getInventory: () => ipcRenderer.invoke('db:getInventory'),
        addInventoryItem: (name, quantity, unit, lowThreshold) => 
            ipcRenderer.invoke('db:addInventoryItem', name, quantity, unit, lowThreshold),
        adjustStock: (id, amount) => ipcRenderer.invoke('db:adjustStock', id, amount),
        deleteInventoryItem: (id) => ipcRenderer.invoke('db:deleteInventoryItem', id),

        getEmployees: () => ipcRenderer.invoke('db:getEmployees'),
        addEmployee: (name, role, baseSalary) => ipcRenderer.invoke('db:addEmployee', name, role, baseSalary),
        updateSalaryParams: (id, field, value) => ipcRenderer.invoke('db:updateSalaryParams', id, field, value),
        togglePaymentStatus: (id) => ipcRenderer.invoke('db:togglePaymentStatus', id),
        deleteEmployee: (id) => ipcRenderer.invoke('db:deleteEmployee', id),
        createOrder: (cashier, total, items) => ipcRenderer.invoke('db:createOrder', cashier, total, items),
        getOrders: () => ipcRenderer.invoke('db:getOrders')
    }
});
