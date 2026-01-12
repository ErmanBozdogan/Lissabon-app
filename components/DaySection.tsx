'use client';

import { Activity } from '@/types';
import ActivityCard from './ActivityCard';
import AddActivityForm from './AddActivityForm';
import { useState } from 'react';

interface DaySectionProps {
  day: { date: string; label: string };
  activities: Activity[];
  currentUserId: string;
  onAddActivity: (activity: Partial<Activity>) => Promise<void>;
  onVote: (activityId: string, vote: 'yes' | 'no') => Promise<void>;
  onEditActivity: (activityId: string, updates: Partial<Activity>) => Promise<void>;
  onDeleteActivity: (activityId: string) => Promise<void>;
}

export default function DaySection({
  day,
  activities,
  currentUserId,
  onAddActivity,
  onVote,
  onEditActivity,
  onDeleteActivity,
}: DaySectionProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const dayActivities = activities.filter(a => a.day === day.date);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 tracking-tight">
          {day.label}
        </h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-gray-900 text-sm font-medium py-2 px-4 rounded-xl transition-all duration-200 shadow-sm hover:shadow"
        >
          {showAddForm ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Annuller</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Tilføj</span>
            </>
          )}
        </button>
      </div>

      {showAddForm && (
        <AddActivityForm
          day={day.date}
          onSubmit={async (activity) => {
            try {
              await onAddActivity(activity);
            } finally {
              setShowAddForm(false);
            }
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {dayActivities.length === 0 ? (
        <div className="text-center py-8 px-4">
          <p className="text-gray-400 dark:text-gray-500 text-sm">
            Ingen aktiviteter planlagt endnu.
          </p>
        </div>
      ) : (
        <div>
          {dayActivities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              currentUserId={currentUserId}
              onVote={onVote}
              onEdit={onEditActivity}
              onDelete={onDeleteActivity}
            />
          ))}
        </div>
      )}
    </div>
  );
}
