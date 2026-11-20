import JoinGroupForm from '@/components/groups/JoinGroupForm';

export default function JoinGroupPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Join a Group</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">Enter the invite code shared with you</p>
      <JoinGroupForm />
    </div>
  );
}
