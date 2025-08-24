// main.js
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ✅ Cache ve kullanıcı verisi yolunu uygulama klasörüne yönlendir
app.setPath('userData', path.join(app.getPath('userData'), 'user_data')); // Daha tutarlı hale getirdik, default userData altında subfolder


let win;
let authToken = null;

function createWindow() {
  console.log("pencere acildi");

  win = new BrowserWindow({
    width: 600,
    height: 400,
    icon: path.join(__dirname, 'assets', 'makler-bot.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false // Güvenlik için false
    }
  });

  win.loadFile('login.html')
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.on('store-token', (event, token) => {
    authToken = token;
    win.loadFile('index.html'); // ✅ Giriş başarılıysa bot paneline geç
  });

  ipcMain.on('start-bot', async (event, account, user) => {
    
    try {
      // win.webContents.send('log-message', 'app.getPath("userData") => ' + app.getPath('userData'));
      win.webContents.send('log-message', 'Bot işləməyə başladı');

      // Chromium başlat
      const profilePath = path.join(app.getPath('userData'), 'my-profile');
      const browser = await chromium.launchPersistentContext(profilePath, {
        headless: false,
        args: ['--start-maximized'],
        executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe'
      });

      const page = await browser.newPage();

      // Devlet sitesine git
      await page.goto('https://digital.login.gov.az/auth/with-asan-login?origin=https:%2F%2Fwww.e-gov.az%2Faz%2Fservices%2Freadwidenew%2F3719%2F2');
      console.log("✅ Səhifə yükləndi. Xaiş olunur giriş edin və filterləri seçin.");
      await page.waitForTimeout(1000);
   const reloadPage = async (page) => {
      await page.evaluate((account) => {
        if (window.__persistentInputPatchAttached) return;
        window.__persistentInputPatchAttached = true;

        const fillInputs = () => {
          const prefixSelect = document.querySelector('select[name="prefix"]');
          if (prefixSelect && prefixSelect.value !== account.prefix) {
            prefixSelect.value = account.prefix;
            prefixSelect.querySelectorAll('option').forEach(opt => {
              if (opt.value !== account.prefix) opt.disabled = true;
            });
            prefixSelect.dispatchEvent(new Event('change', { bubbles: true }));
          }

          const phoneInput = document.querySelector('input[name="phoneNum"]');
          if (phoneInput && phoneInput.value !== account.phone) {
            phoneInput.value = account.phone;
            phoneInput.setAttribute('readonly', 'true');
            phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
          }

          const pinInput = document.querySelector('input[name="pin"]');
          if (pinInput && pinInput.value !== account.id) {
            pinInput.value = account.id;
            pinInput.setAttribute('readonly', 'true');
            pinInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
        };

        window.addEventListener('DOMContentLoaded', fillInputs);
        const observer = new MutationObserver(fillInputs);
        observer.observe(document.body, { childList: true, subtree: true });
        setInterval(fillInputs, 1000);
      }, account);
    };





      // Bot fonksiyonlarını dışarıdan tetikle
      await page.exposeFunction('triggerBotActions', async () => {
        console.log('🔁 Sonsuz bot döngüsü başladı...');

        for (const frame of page.frames()) {
          try {
            await frame.evaluate(() => {
              if (window.__modalObserverAttached) return;
              window.__modalObserverAttached = true;

              const observer = new MutationObserver(() => {
                document.querySelectorAll('.sweet-alert, .sweet-overlay').forEach(el => el.remove());
              });

              observer.observe(document.body, { childList: true, subtree: true });
              console.log('🛡️ Modal əngəlləyici observer iframe içinə enjekte edildi.');
            });
          } catch (err) {
            console.warn('⚠️ Modal observer enjekte edilmedi:', err.message);
          }
        }

        let loopActive = true;

        const delay = user?.profile?.clickDelayMs || 1000;

        while (loopActive) {
          try {
            const frames = page.frames();
            let actionPerformed = false;

            for (const frame of frames) {
              const searchBtn = frame.locator('button', { hasText: 'Axtar' });
              if (await searchBtn.count() > 0) {
                try {
                  await searchBtn.first().click({ timeout: 3000 });
                  console.log('✅ Axtar butonuna klikləndi.');

                  await frame.evaluate(() => {
                    return new Promise(resolve => {
                      let lastHtml = document.body.innerHTML;
                      const check = () => {
                        if (document.body.innerHTML !== lastHtml) {
                          resolve(true);
                        } else {
                          requestAnimationFrame(check);
                        }
                      };
                      check();
                    });
                  });

                  const selectBtn = frame.locator('button', { hasText: 'Seç' });
                  if (await selectBtn.count() > 0) {
                    await selectBtn.first().click({ timeout: 3000 });
                    console.log('✅ Seç butonuna klikləndi.');

                    const confirmBtn = frame.locator('button#btnRegister', { has: frame.locator('span', { hasText: 'Təsdiqlə' }) });
                    await confirmBtn.first().click({ timeout: 3000 });
                    console.log('✅ Təsdiqlə butonuna klikləndi. Level tamamlandı!');
                    loopActive = false;
                    actionPerformed = true;
                    break;
                  } else {
                    console.log('ℹ️ Seç butonu tapılmadı.');
                  }

                } catch (clickErr) {
                  console.warn('⚠️ Axtar veya Seç klikləmə uğursuz:', clickErr.message);
                }
              }
            }

            if (!actionPerformed) {
              console.warn('⚠️ Axtar butonu heçbir frame içində tapılmadı, tekrar yoxlanılacaq...');
            }
            
            await page.waitForTimeout(delay);
          } catch (err) {
            console.error('❌ Döngü xətası:', err);
            await page.waitForTimeout(1000);
          }
        }
      });

      // Ctrl 3 saniye basınca botu başlat
      const attachKeyListener = async (page) => {
        try {
          await page.evaluate(() => {
            if (window.__botListenerAttached) return;
            window.__botListenerAttached = true;

            let timer = null;

            document.addEventListener('keydown', (e) => {
              if (e.key === 'Control') {
                timer = setTimeout(() => {
                  console.log('✅ BOT başladı: Ctrl 3 saniye basılı tutuldu');
                  window.triggerBotActions();
                }, 3000);
              }
            });

            document.addEventListener('keyup', (e) => {
              if (e.key === 'Control') {
                clearTimeout(timer);
              }
            });
          });
        } catch (err) {
          console.error('❌ Dinləyici enjekte edilə bilmedi:', err);
        }
      };

      page.on('framenavigated', async () => {
        // console.log('🔄 Səhifə dəyişdi, dinləyici yenidən əlavə edilir...');
        await attachKeyListener(page);
        await reloadPage(page)
      });

      // page.on('response', async (response) => {
        
        
      //   const url = response.url();
      //   console.log("Responseee url", url);
      //   if (url.includes('digital.login.gov.az/auth/with-asan-login')) {
      //     console.log('📡 Asan login sayfası response aldı, input patching tetikleniyor...');
      //     await reloadPage(page);
      //   }
      // });

      await attachKeyListener(page);
      await reloadPage(page)

    } catch (err) {
      console.error('Chromium açılırken hata:', err);
    }
  });
});