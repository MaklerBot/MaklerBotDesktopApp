const { contextBridge, ipcRenderer } = require('electron');
// const BASE_URL = process.env.STAGING === '1'
//   ? 'http://localhost:3002'
//   : 'https://maklerbotbackend.onrender.com'

const BASE_URL = 'https://maklerbotbackend.onrender.com'

// console.log("window package", app.isPackaged);



async function verifyToken(token) {
  try {
    const response = await fetch(`${BASE_URL}/api/current-user`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) return false;

    const userInfo = await response.json();

    if (!userInfo?._id || !userInfo.active) {
      return false;
    }

    return true;
  } catch (err) {
    console.error('🔐 Token doğrulama hatası:', err);
    return false;
  }
}

contextBridge.exposeInMainWorld('electronAPI', {
  checkAuth: async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      window.location.href = 'login.html';
      return;
    }

    const isValid = await verifyToken(token);
    if (!isValid) {
      localStorage.removeItem('auth_token');
      window.location.href = 'login.html';
    } else {
      window.location.href = 'index.html';
    }
  },
  login: async (credentials) => {
    console.log("BASE_URL", BASE_URL);
    
    const response = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Giriş başarısız");
    }

    return await response.json(); // { token, user }
  },
  getCurrentUser: async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return null;

    try {
      const response = await fetch(`${BASE_URL}/api/current-user`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) return null;
      const userInfo = await response.json();
      return userInfo;
    } catch (err) {
      console.error('🔐 Kullanıcı bilgisi alınamadı:', err);
      return null;
    }
  },
  storeToken: (token) => {
    ipcRenderer.send('store-token', token);
    localStorage.setItem('auth_token', token);
  },
  startBot: (account, user) => ipcRenderer.send('start-bot', account, user),
  onLogMessage: (callback) => ipcRenderer.on('log-message', (event, message) => callback(message))
});


