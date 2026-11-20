'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { signOut } from '@/lib/firebase/auth';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const { user } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <nav className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          <Link href="/dashboard" className="flex items-center gap-1.5 shrink-0">
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              💰 Ah Long
            </span>
          </Link>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            {user && (
              <>
                <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block max-w-[120px] truncate">
                  {user.displayName || user.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 px-2 py-1"
                >
                  Sign Out
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
