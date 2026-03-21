import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "وراق حر",
  description: "منصة عربية حديثة للأخبار والموجز والمصادر والتصنيفات.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
