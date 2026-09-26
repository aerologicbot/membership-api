import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Sama dengan aerologicbot-web-app: Inter sebagai --font-sans, bobot 300-700.
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Daftar Membership — AeroLogic",
  description: "Pendaftaran membership AeroLogic: market intelligence untuk trader saham Indonesia.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
