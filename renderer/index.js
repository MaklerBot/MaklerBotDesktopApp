document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('auth_token'); // Token'ı sil
  window.location.href = 'login.html';   // Login sayfasına yönlendir
});


document.getElementById('startBtn').addEventListener('click', () => {
  window.electronAPI.startBot();
});

window.electronAPI.onLogMessage((msg) => {
  document.getElementById("log").innerText += msg + "\n";
});
