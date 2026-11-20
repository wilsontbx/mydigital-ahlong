import CreateGroupForm from '@/components/groups/CreateGroupForm';

export default function NewGroupPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Create a Group</h1>
      <CreateGroupForm />
    </div>
  );
}
