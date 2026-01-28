import './globals.css';
import { Inter } from 'next/font/google';
import type { Metadata } from "next";

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Checklist KPPN Kota Lhokseumawe',
  description: 'Digitalisasi Pemeliharaan Gedung & Kendaraan',
  icons: {
    icon: "/favicon.ico", // Ganti dengan nama file logo Anda di folder public
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={inter.className}>{children}</body>
    </html>
  );
}