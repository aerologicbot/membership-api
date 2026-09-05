import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Telegram Premium Demo", description: "Membership lifecycle control panel" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
