import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import Layout from '@/components/Layout';
import Providers from '@/app/providers';

export const metadata: Metadata = {
  title: 'GistPin Analytics',
  description: 'Analytics dashboard for the GistPin platform',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <Providers>
          <Layout>{children}</Layout>
        </Providers>
      </body>
    </html>
  );
}
