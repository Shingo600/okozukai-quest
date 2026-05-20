/* Service Worker — network-first for navigation, cache-first for static assets */
const CACHE = "okq-v4";
const ASSETS = ["/manifest.json", "/icon.svg", "/icon-192.png", "/icon-512.png", "/offline.html"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).catch(() => {}));
  // 新版が install 完了したら、待たずに有効化
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// クライアントからの SKIP_WAITING 要求を受け取る
self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // ナビゲーション（HTMLページ）は network-first
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // 成功した HTML はキャッシュ更新（オフライン時の表示用）
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          if (cached) return cached;
          const offline = await caches.match("/offline.html");
          if (offline) return offline;
          return Response.error();
        })
    );
    return;
  }

  // それ以外（JS/CSS/画像/manifest等）は cache-first + 背景更新
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => cached || Response.error());
      return cached || fetchPromise;
    })
  );
});
