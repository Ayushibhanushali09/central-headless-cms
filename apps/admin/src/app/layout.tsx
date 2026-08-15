import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AuthProvider } from '../features/auth/auth-provider';

import './global.css';

export const metadata: Metadata = {
  title: {
    default: 'Central CMS',
    template: '%s | Central CMS',
  },
  description: 'Centralized headless content platform',
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({
  children,
}: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}