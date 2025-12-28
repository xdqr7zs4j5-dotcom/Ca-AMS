// sw.js — Cá AMS v4 (stable, iframe-safe)

const VERSION = 'v4';
const CACHE_SHELL  = `ca-ams-shell-${VERSION}`;
const CACHE_ASSETS = `ca-ams-assets-${VERSION}`;

// Shell = KHUNG ỨNG DỤNG (KHÔNG phải begin.html)
const SHELL_FILES = [
  '/index.html',
];

// Asset tĩnh, KHÔNG cache app.js theo kiểu cache-first
const STATIC_ASSETS = [
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// === BOOT FILES (cần để app khởi động offline) ===
const BOOT_ASSETS = [
  '/app.js',
  '/splash.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];


/* ================= INSTALL ================= */
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const shellCache = await caches.open(CACHE_SHELL);
      await shellCache.addAll([...SHELL_FILES, ...BOOT_ASSETS]);
      self.skipWaiting();
    })()
  );
});

/* ================= ACTIVATE ================= */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((k) => {
          if (k.startsWith('ca-ams-') && ![CACHE_SHELL, CACHE_ASSETS].includes(k)) {
            return caches.delete(k);
          }
        })
      );
      await self.clients.claim();
    })()
  );
});

/* ================= FETCH ================= */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // ❌ Không đụng Supabase, API, POST, PUT
  if (
    req.method !== 'GET' ||
    url.origin !== self.location.origin
  ) {
    return;
  }
  /* ========= 0️⃣ BOOT ASSETS ========= */
const path = url.pathname;
if (BOOT_ASSETS.includes(path)) {
  event.respondWith(
    caches.match(req).then(res => res || fetch(req))
  );
  return;
}

  /* ========= 1️⃣ TOP-LEVEL NAVIGATION ========= */
  // CHỈ index.html mới là shell
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(req);
        } catch {
          const cache = await caches.open(CACHE_SHELL);
          return await cache.match('/index.html');
        }
      })()
    );
    return;
  }

  /* ========= 2️⃣ IFRAME HTML (begin.html, chamcong.html...) ========= */
  // Network-first, KHÔNG fallback sang trang khác
  if (req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      (async () => {
        try {
          return await fetch(req);
        } catch {
          // iframe fail thì để iframe fail, KHÔNG tráo HTML
          return new Response(
            '<h3 style="font-family:sans-serif;padding:16px">Không có mạng</h3>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        }
      })()
    );
    return;
  }

  /* ========= 3️⃣ STATIC ASSETS ========= */
  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_ASSETS);
        const hit = await cache.match(req);
        if (hit) return hit;

        const net = await fetch(req);
        cache.put(req, net.clone());
        return net;
      })()
    );
    return;
  }

  /* ========= 4️⃣ DEFAULT ========= */
  // JS (app.js), CSS, module → luôn network-first
  event.respondWith(fetch(req));
});
