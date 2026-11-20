'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { joinGroupByCode } from '@/lib/services/groupService';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';

export default function JoinGroupForm() {
  const { user } = useAuth();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const groupId = await joinGroupByCode(code, {
        uid: user.uid,
        displayName: user.displayName || 'User',
        email: user.email || '',
      });
      toast.success('Joined group!');
      router.push(`/groups/${groupId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to join group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <Input
        label="Invite Code"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Enter 6-character code"
        maxLength={6}
        required
        className="text-center text-2xl tracking-[0.3em] font-mono"
      />
      <Button type="submit" loading={loading} className="w-full">
        Join Group
      </Button>
    </form>
  );
}
