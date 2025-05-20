import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ApiErrorBoundary from '@/components/ui/ApiErrorBoundary';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GinChat - Real-time Chat Application',
  description: 'A modern real-time chat application built with Go (Gin) backend and React (Next.js) frontend',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ApiErrorBoundary>
          {children}
        </ApiErrorBoundary>
      </body>
    </html>
  );
}
