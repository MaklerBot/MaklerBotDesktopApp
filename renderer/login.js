const loginBtn = document.getElementById('loginBtn');
const errorDiv = document.getElementById('error');

loginBtn.addEventListener('click', async () => {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!username || !password) {
    errorDiv.innerText = "Xaiş olunur bütün xanaları doldurun.";
    return;
  }

  try {
    console.log("salam");
    
    const result = await window.electronAPI.login({ username, password });
    window.electronAPI.storeToken(result.token); // token'ı sakla
    window.location.href = "index.html"; // başarılıysa yönlendir
  } catch (err) {
    errorDiv.innerText = err.message || "Giriş başarısız.";
  }
});


