interface StatCardProps {
  label: string;
  value: string;
  subtext?: string;
  accent?: 'emerald' | 'blue' | 'amber' | 'purple' | 'rose';
}

const accentStyles = {
  emerald: 'from-emerald-500/10 to-emerald-500/5 dark:from-emerald-500/15 dark:to-emerald-500/5 border-emerald-200/60 dark:border-emerald-500/20',
  blue: 'from-blue-500/10 to-blue-500/5 dark:from-blue-500/15 dark:to-blue-500/5 border-blue-200/60 dark:border-blue-500/20',
  amber: 'from-amber-500/10 to-amber-500/5 dark:from-amber-500/15 dark:to-amber-500/5 border-amber-200/60 dark:border-amber-500/20',
  purple: 'from-purple-500/10 to-purple-500/5 dark:from-purple-500/15 dark:to-purple-500/5 border-purple-200/60 dark:border-purple-500/20',
  rose: 'from-rose-500/10 to-rose-500/5 dark:from-rose-500/15 dark:to-rose-500/5 border-rose-200/60 dark:border-rose-500/20',
};

const dotStyles = {
  emerald: 'bg-emerald-500',
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
  purple: 'bg-purple-500',
  rose: 'bg-rose-500',
};

export default function StatCard({ label, value, subtext, accent }: StatCardProps) {
  const base = accent
    ? `bg-gradient-to-br ${accentStyles[accent]} border`
    : 'bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/60';

  return (
    <div className={`${base} rounded-2xl p-3 sm:p-4 min-w-0`}>
      <div className="flex items-center gap-1.5 mb-1">
        {accent && <span className={`w-1.5 h-1.5 rounded-full ${dotStyles[accent]} shrink-0`} />}
        <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">
          {label}
        </p>
      </div>
      <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate leading-tight">
        {value}
      </p>
      {subtext && (
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">{subtext}</p>
      )}
    </div>
  );
}
