/* Service Worker — same-origin only. Cross-origin (Supabase 等) は触らない */
const CACHE = "okq-v6";
const ASSETS = ["/manifest.json", "/icon.svg", "/icon-192.png", "/icon-512.png", "/offline.html"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).catch(() => {}));
  // 新版は waiting 状態のままにし、開いているタブを強制リロードしない。
  // 次回開き直したときに自然に切り替わる。
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// クライアントから明示的な要求があった場合のみ skipWaiting する
self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // クロスオリジン（Supabase など外部 API）は SW で触らない。
  // ここで return すれば、ブラウザがそのままネットワークに直接出る。
  let url;
  try { url = new URL(req.url); } catch { return; }
  if (url.origin !== self.location.origin) return;

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

  // 同一オリジンの静的アセット（JS/CSS/画像/manifest等）は cache-first + 背景更新
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
