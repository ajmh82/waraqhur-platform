import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Waraqhur",
  description: "Professional API-first platform foundation built with Next.js and Prisma."
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar">
      <body>{children}</body>
    </html>
  );
}
