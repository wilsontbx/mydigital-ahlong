'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

export default function InviteCodeDisplay({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Invite code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-3">
      <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-lg font-mono text-lg tracking-[0.3em] text-gray-900 dark:text-gray-100">
        {code}
      </div>
      <button
        onClick={handleCopy}
        className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}
