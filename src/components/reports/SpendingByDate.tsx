'use client';

import { useState } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { format, eachDayOfInterval, parseISO } from 'date-fns';
import { formatCurrency } from '@/lib/utils/currency';
import { getExpenseDates } from '@/lib/utils/dateFormat';
import type { Expense, GroupMember } from '@/lib/types';

interface Props {
  expenses: Expense[];
  currency: string;
  startDate?: string;
  endDate?: string;
  members?: Record<string, GroupMember>;
  memberIds?: string[];
  /** Draw a line per person. Off = total bars only. */
  showPeople?: boolean;
}

// Person line colours (bars use the neutral emerald total colour).
const PERSON_COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899', '#14b8a6', '#84cc16', '#f97316'];

type Row = { date: string; label: string; total: number } & Record<string, number | string>;

const round2 = (n: number) => Math.round(n * 100) / 100;

export default function SpendingByDate({ expenses, currency, startDate, endDate, members = {}, memberIds, showPeople = true }: Props) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  // Daily group total, plus each person's share (from expense splits) per day.
  const dailyTotals: Record<string, number> = {};
  const dailyByPerson: Record<string, Record<string, number>> = {};
  let undatedTotal = 0;
  const undatedByPerson: Record<string, number> = {};
  const peopleSeen = new Set<string>();

  expenses.forEach((e) => {
    const expDates = getExpenseDates(e);
    const amt = e.baseCurrencyAmount || e.amount;
    const splits = e.splits || {};
    Object.keys(splits).forEach((uid) => peopleSeen.add(uid));

    if (expDates.length === 0) {
      undatedTotal += amt;
      for (const [uid, share] of Object.entries(splits)) {
        undatedByPerson[uid] = (undatedByPerson[uid] || 0) + share;
      }
      return;
    }
    const days = expDates.length;
    expDates.forEach((key) => {
      dailyTotals[key] = (dailyTotals[key] || 0) + amt / days;
      if (!dailyByPerson[key]) dailyByPerson[key] = {};
      for (const [uid, share] of Object.entries(splits)) {
        dailyByPerson[key][uid] = (dailyByPerson[key][uid] || 0) + share / days;
      }
    });
  });

  // Stable person order: group member order first, then anyone else seen in splits.
  const people = showPeople
    ? [
        ...(memberIds || []).filter((id) => peopleSeen.has(id)),
        ...[...peopleSeen].filter((id) => !memberIds?.includes(id)),
      ]
    : [];
  const colorOf = (uid: string) => PERSON_COLORS[people.indexOf(uid) % PERSON_COLORS.length];
  const nameOf = (uid: string) => members[uid]?.displayName || 'Unknown';

  const buildRow = (key: string, spread: number, spreadByPerson: Record<string, number>): Row => {
    const row: Row = {
      date: key,
      label: format(parseISO(key), 'd MMM'),
      total: round2((dailyTotals[key] || 0) + spread),
    };
    people.forEach((uid) => {
      row[uid] = round2((dailyByPerson[key]?.[uid] || 0) + (spreadByPerson[uid] || 0));
    });
    return row;
  };

  let data: Row[];

  if (startDate && endDate) {
    const allDays = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });
    // Undated (e.g. pre-paid) spending is spread evenly over the trip, same as before.
    const n = allDays.length;
    const spread = undatedTotal > 0 ? undatedTotal / n : 0;
    const spreadByPerson = Object.fromEntries(
      Object.entries(undatedByPerson).map(([uid, v]) => [uid, v / n])
    );
    data = allDays.map((day) => buildRow(format(day, 'yyyy-MM-dd'), spread, spreadByPerson));
  } else {
    data = Object.keys(dailyTotals).sort().map((key) => buildRow(key, 0, {}));
  }

  if (data.length === 0) return null;

  const toggle = (key: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700/60 p-4 sm:p-5 min-w-0 overflow-hidden">
      <h3 className={`text-sm font-semibold text-gray-900 dark:text-gray-100 ${showPeople ? 'mb-1' : 'mb-4'}`}>Daily Spending</h3>
      {showPeople && (
      <>
      <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-3">
        Bars: group total · Lines: each person&apos;s share
      </p>

      {/* Legend — tap to show/hide a series */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {[{ key: 'total', name: 'Total', color: '#10b981' }, ...people.map((uid) => ({ key: uid, name: nameOf(uid), color: colorOf(uid) }))].map((s) => {
          const off = hidden.has(s.key);
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => toggle(s.key)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] border transition-opacity ${
                off ? 'opacity-40' : ''
              } border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300`}
            >
              <span
                className={s.key === 'total' ? 'w-2.5 h-2.5 rounded-sm' : 'w-3 h-0.5 rounded-full'}
                style={{ backgroundColor: s.color }}
              />
              {s.name}
            </button>
          );
        })}
      </div>
      </>
      )}

      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ left: 0, right: 5, top: 5, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.07} />
          <XAxis
            dataKey="label"
            fontSize={9}
            angle={-45}
            textAnchor="end"
            height={50}
            interval={data.length > 14 ? Math.floor(data.length / 7) : 0}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#9ca3af' }}
          />
          <YAxis
            tickFormatter={(v) => formatCurrency(v, currency)}
            fontSize={9}
            width={55}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#9ca3af' }}
          />
          <Tooltip
            formatter={(value, name) => [
              formatCurrency(Number(value), currency),
              name === 'total' ? 'Total' : nameOf(String(name)),
            ]}
            labelFormatter={(label) => label}
            contentStyle={{
              backgroundColor: 'var(--background)',
              border: 'none',
              borderRadius: '12px',
              fontSize: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
              padding: '8px 12px',
            }}
            cursor={{ fill: 'currentColor', opacity: 0.05 }}
          />
          {!hidden.has('total') && (
            <Bar dataKey="total" fill="#10b981" fillOpacity={showPeople ? 0.35 : 1} radius={[4, 4, 0, 0]} maxBarSize={40} />
          )}
          {people.filter((uid) => !hidden.has(uid)).map((uid) => (
            <Line
              key={uid}
              type="monotone"
              dataKey={uid}
              stroke={colorOf(uid)}
              strokeWidth={2}
              dot={data.length <= 14 ? { r: 2.5 } : false}
              activeDot={{ r: 4 }}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
