import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/authContext';
import { RestTimerProvider } from '@/components/RestTimer';

export const metadata: Metadata = {
  title: 'FitLog Pro - Relational Multi-Tenant Fitness Platform',
  description: 'Athletic workout tracking, trainer-client management, and nutrition logging powered by Django & PostgreSQL.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <RestTimerProvider>
            {children}
          </RestTimerProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
