// index.mjs
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
console.log("__dirname",__dirname);


// Komut satırı argümanından çalışma modunu al
const isPackaged = process.argv.includes('--packaged');

const browserPath = isPackaged
  ? path.join(__dirname, 'node_modules', 'playwright-core', '.local-browsers', 'chromium-1181', 'chrome-win', 'chrome.exe')
  : undefined;

const profilePath = path.join(__dirname, 'my-profile');

const context = await chromium.launchPersistentContext(profilePath, {
  headless: false,
  executablePath: browserPath,
  args: ['--start-maximized']
});

// Yeni sayfa aç
const page = await context.newPage();

// Devlet sitesine git
await page.goto('https://digital.login.gov.az/auth/with-asan-login?origin=https:%2F%2Fwww.e-gov.az%2Faz%2Fservices%2Freadwidenew%2F3719%2F2');

console.log("✅ Səhifə yükləndi. Xaiş olunur giriş edin və filterləri seçin.");


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

while (loopActive) {
  try {
    const frames = page.frames();
    let actionPerformed = false;

    for (const frame of frames) {
      // 1️⃣ Axtar butonunu ara
      const searchBtn = frame.locator('button', { hasText: 'Axtar' });

      if (await searchBtn.count() > 0) {
        try {
          await searchBtn.first().click({ timeout: 3000 });
          console.log('✅ Axtar butonuna klikləndi.');

          // 2️⃣ DOM değişikliğini bekle
          await frame.evaluate(() => {
            return new Promise(resolve => {
              let lastHtml = document.body.innerHTML;
              const check = () => {
                if (document.body.innerHTML !== lastHtml) {
                  resolve(true); // DOM değişti
                } else {
                  requestAnimationFrame(check);
                }
              };
              check();
            });
          });
          console.log('📥 DOM dəyişdi, yeni data geldi.');

          // 3️⃣ Seç butonuna tıkla
          const selectBtn = frame.locator('button', { hasText: 'Seç' });
          console.log("selectBtn",selectBtn);
          
          if (await selectBtn.count() > 0) {
            await selectBtn.first().click({ timeout: 3000 });
            console.log('✅ Seç butonuna klikləndi.');

            // 4️⃣ Artık Axtar’a dönmeyeceğiz, Təsdiqlə butonunu ara
            const confirmBtn = frame.locator('button#btnRegister', { has: frame.locator('span', { hasText: 'Təsdiqlə' }) });
            console.log("confirmBtn",confirmBtn);
            
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

    await page.waitForTimeout(300); // kısa bekleme

  } catch (err) {
    console.error('❌ Döngü xətası:', err);
    await page.waitForTimeout(1000);
  }
}




});





// Sayfa içine JS enjekte et → Ctrl tuşuna 3 saniye basınca işlem tetiklenir
const attachKeyListener = async (page) => {
  try {
    await page.evaluate(() => {
      if (window.__botListenerAttached) return;
      window.__botListenerAttached = true;

      let ctrlPressedTime = null;
      let timer = null;

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Control') {
          ctrlPressedTime = Date.now();
          timer = setTimeout(() => {
            console.log('✅ BOT başladı: Ctrl 3 saniye basılı tutuldu');
            window.triggerBotActions(); // dışarıdan tanımlanan fonksiyonu çağır
          }, 3000);
        }
      });

      document.addEventListener('keyup', (e) => {
        if (e.key === 'Control') {
          clearTimeout(timer);
          ctrlPressedTime = null;
        }
      });
    });
  } catch (err) {
    console.error('❌ Dinləyici enjekte edilə bilmedi:', err);
  }
};



// Her sayfa geçişinde dinleyiciyi enjekte et
page.on('framenavigated', async () => {
  // console.log('🔄 Səhifə dəyişdi, dinləyici yenidən əlavə edilir...');
  await attachKeyListener(page);
});

// İlk sayfa için de ekle
await attachKeyListener(page);

