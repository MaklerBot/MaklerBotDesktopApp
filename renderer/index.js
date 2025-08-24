document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('auth_token'); // Token'ı sil
  window.location.href = 'login.html';   // Login sayfasına yönlendir
});


document.getElementById('startBtn').addEventListener('click', async () => {
  const select = document.getElementById('accountSelect');
  const selectedOption = select.options[select.selectedIndex];
  const user = await window.electronAPI.getCurrentUser();
  const account = {
    prefix: selectedOption.dataset.prefix,
    phone: selectedOption.dataset.phone,
    id: selectedOption.dataset.id
  };

  console.log("user", user);
  
  window.electronAPI.startBot(account, user);
});

window.electronAPI.onLogMessage((msg) => {
  document.getElementById("log").innerText += msg + "\n";
});


window.addEventListener('DOMContentLoaded', async () => {
  const accountSelect = document.getElementById('accountSelect');

  try {
    const user = await window.electronAPI.getCurrentUser();
    if (!user || !user.profile || !Array.isArray(user.profile.asanAccounts)) return;

    user.profile.asanAccounts.forEach((account, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.innerText = `${account.prefix}${account.phone}`;
      option.dataset.prefix = account.prefix;
      option.dataset.phone = account.phone;
      option.dataset.id = account.id;
      accountSelect.appendChild(option);
    });
  } catch (err) {
    console.error('⚠️ Asan hesapları yüklenemedi:', err);
  }
});
