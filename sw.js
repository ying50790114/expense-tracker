const CACHE_NAME = 'budget-app-v3';

// 只快取本地靜態資源（CDN 資源讓瀏覽器自行快取）
const LOCAL_ASSETS = [
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/gpt_icon.png',
];

// 安裝：只快取本地資源，單筆失敗不中斷整體安裝
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(
        LOCAL_ASSETS.map(url =>
          cache.add(url).catch(err => console.warn('SW cache skip:', url, err))
        )
      )
    )
  );
  self.skipWaiting();
});

// 啟動：清除舊版快取
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 攔截請求
// - 本地資源：快取優先，失敗走網路
// - CDN / 外部 API：網路優先，失敗走快取
self.addEventListener('fetch', e => {
  const url = e.request.url;
  const isLocal = url.startsWith(self.location.origin);
  const isApi   = url.includes('corsproxy.io') || url.includes('rate.bot.com.tw') || url.includes('allorigins.win');

  if (isApi) {
    // 匯率 API：永遠走網路，不快取
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  if (isLocal) {
    // 本地資源：快取優先
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request))
    );
  } else {
    // CDN：網路優先，失敗走快取
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res && res.status === 200 && res.type === 'basic') {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  }
});
