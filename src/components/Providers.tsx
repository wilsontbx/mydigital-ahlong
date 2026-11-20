'use client';

import { ThemeProvider } from 'next-themes';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/lib/contexts/AuthContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            className: '!bg-white !text-gray-900 dark:!bg-gray-800 dark:!text-gray-100',
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  );
}
