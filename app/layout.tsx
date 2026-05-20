import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "おこづかいクエスト",
  description: "お手伝いをして、おこづかいをゲットしよう！",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "おこづかいクエスト" },
  icons: { icon: "/icon-192.png", apple: "/icon-192.png", shortcut: "/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#B89CE6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', async () => {
                  try {
                    var reg = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
                    // 新版検出 → 即座にアクティベート
                    if (reg.waiting) { reg.waiting.postMessage({ type: 'SKIP_WAITING' }); }
                    reg.addEventListener('updatefound', function() {
                      var sw = reg.installing;
                      if (!sw) return;
                      sw.addEventListener('statechange', function() {
                        if (sw.state === 'installed' && navigator.serviceWorker.controller) {
                          sw.postMessage({ type: 'SKIP_WAITING' });
                        }
                      });
                    });
                    // 30秒ごとに更新チェック（タブが開いている間）
                    setInterval(function(){ reg.update().catch(function(){}); }, 30000);
                    // 新ワーカーに制御が切り替わったら一度だけリロード
                    var reloaded = false;
                    navigator.serviceWorker.addEventListener('controllerchange', function() {
                      if (reloaded) return;
                      reloaded = true;
                      location.reload();
                    });
                  } catch(e) {}
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
