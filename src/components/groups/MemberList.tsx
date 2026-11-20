import type { GroupMember } from '@/lib/types';

interface MemberListProps {
  members: Record<string, GroupMember>;
  currentUserId?: string;
}

export default function MemberList({ members, currentUserId }: MemberListProps) {
  return (
    <ul className="divide-y divide-gray-100 dark:divide-gray-700">
      {Object.entries(members).map(([uid, member]) => (
        <li key={uid} className="py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {member.displayName}
              {uid === currentUserId && (
                <span className="ml-2 text-xs text-emerald-600 dark:text-emerald-400">(you)</span>
              )}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{member.email}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
