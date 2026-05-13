import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"]
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"]
});

export const metadata: Metadata = {
  title: "Super Nova",
  description: "Intent is the new interface.",
  applicationName: "Super Nova",
  icons: {
    icon: "/brand/super-nova-logo.png",
    apple: "/brand/super-nova-logo.png"
  },
  appleWebApp: {
    capable: true,
    title: "Super Nova",
    statusBarStyle: "black-translucent"
  }
};

export const viewport: Viewport = {
  themeColor: "#05060a",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
