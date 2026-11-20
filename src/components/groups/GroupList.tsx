import type { Group } from '@/lib/types';
import GroupCard from './GroupCard';

export default function GroupList({ groups }: { groups: Group[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map((group) => (
        <GroupCard key={group.id} group={group} />
      ))}
    </div>
  );
}
