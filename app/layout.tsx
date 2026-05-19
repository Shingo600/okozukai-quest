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
            __html: `if ('serviceWorker' in navigator) { window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(()=>{})); }`,
          }}
        />
      </body>
    </html>
  );
}
