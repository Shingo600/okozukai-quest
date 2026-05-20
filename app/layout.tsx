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
                    // sw.js 自体はブラウザキャッシュさせない
                    var reg = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
                    // 1時間ごとに更新チェック（過剰な更新を避ける）
                    setInterval(function(){ reg.update().catch(function(){}); }, 60 * 60 * 1000);
                    // 新版は自動適用しない（使用中のページがリロードされてしまうのを防ぐ）。
                    // 次回タブを開き直したときに自然に新版が有効化される。
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
