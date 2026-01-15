'use client';

import { Activity } from '@/types';
import ActivityCard from './ActivityCard';
import { useState, useEffect } from 'react';

interface DaySectionProps {
  day: { date: string; label: string };
  activities: Activity[];
  currentUserId: string;
  onAddActivity: (activity: Partial<Activity>) => Promise<void>;
  onVote: (activityId: string, emoji?: string, type?: 'like' | 'dislike') => Promise<void>;
  onEditActivity: (activityId: string, updates: Partial<Activity>) => Promise<void>;
  onDeleteActivity: (activityId: string) => Promise<void>;
  onCommentAdd?: (activityId: string, text: string) => Promise<void>;
  onCommentEdit?: (activityId: string, commentId: string, text: string) => Promise<void>;
  onCommentDelete?: (activityId: string, commentId: string) => Promise<void>;
}

export default function DaySection({
  day,
  activities,
  currentUserId,
  onAddActivity,
  onVote,
  onEditActivity,
  onDeleteActivity,
  onCommentAdd,
  onCommentEdit,
  onCommentDelete,
}: DaySectionProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const dayActivities = activities.filter(a => a.day === day.date);
  const [isCollapsed, setIsCollapsed] = useState(dayActivities.length === 0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState<Activity['category']>('other');
  const [budget, setBudget] = useState<Activity['budget']>();
  const [status, setStatus] = useState<Activity['status']>('tentative');
  
  // Update collapsed state when activities change
  useEffect(() => {
    if (dayActivities.length === 0) {
      setIsCollapsed(true);
    }
  }, [dayActivities.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await onAddActivity({
      title: title.trim(),
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      day: day.date,
      category,
      budget: budget || undefined,
      status: status || 'tentative',
    });
    
    setBudget(undefined);
    setStatus('tentative');
    
    // Expand if collapsed after adding activity
    if (isCollapsed) {
      setIsCollapsed(false);
    }

    setTitle('');
    setDescription('');
    setLocation('');
    setCategory('other');
    setBudget(undefined);
    setShowAddForm(false);
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-2 text-left"
        >
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 tracking-tight">
            {day.label}
          </h2>
        </button>
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
              <span>Add</span>
            </>
          )}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900/50 rounded-2xl shadow-sm p-5 mb-4 border border-gray-100 dark:border-gray-800/50">
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
              Titel *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent transition-all"
              placeholder="f.eks. Besøg Belém Tower"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
              Kategori
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Activity['category'])}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent transition-all"
            >
              <option value="restaurant">🍽️ Restaurant</option>
              <option value="brunch">🥐 Brunch</option>
              <option value="sightseeing">🏛️ Seværdighed</option>
              <option value="bar">🍻 Bar</option>
              <option value="cafe">☕ Cafe</option>
              <option value="experience">🎭 Oplevelse</option>
              <option value="other">📍 Andet</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
              Beskrivelse
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent transition-all resize-none"
              placeholder="Valgfri beskrivelse..."
              rows={3}
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
              Lokation
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent transition-all"
              placeholder="Valgfri adresse, lokation eller website URL"
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
              Budget
            </label>
            <select
              value={budget || ''}
              onChange={(e) => setBudget(e.target.value as Activity['budget'] || undefined)}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent transition-all"
            >
              <option value="">Ingen budget</option>
              <option value="cheap">💸 Cheap</option>
              <option value="medium">💸💸 Medium</option>
              <option value="expensive">💸💸💸 Expensive</option>
            </select>
          </div>

          <div className="mb-5">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
              Status
            </label>
            <select
              value={status || 'tentative'}
              onChange={(e) => setStatus(e.target.value as Activity['status'] || 'tentative')}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent transition-all"
            >
              <option value="tentative">🟡 Tentative</option>
              <option value="confirmed">🟢 Confirmed</option>
            </select>
          </div>

          <div className="flex gap-2.5">
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex-1 bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-gray-900 font-medium py-2.5 px-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200"
            >
              Annuller
            </button>
          </div>
        </form>
      )}

      {!isCollapsed && (
        <>
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
                  onCommentAdd={onCommentAdd}
                  onCommentEdit={onCommentEdit}
                  onCommentDelete={onCommentDelete}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
