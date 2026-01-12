'use client';

import { useState } from 'react';
import { Activity } from '@/types';

interface AddActivityFormProps {
  day: string;
  onSubmit: (activity: Partial<Activity>) => Promise<void>;
  onCancel: () => void;
}

export default function AddActivityForm({ day, onSubmit, onCancel }: AddActivityFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState<Activity['category']>('other');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        day,
        category,
      });
      setTitle('');
      setDescription('');
      setLocation('');
      setCategory('other');
    } catch (error) {
      console.error('Error adding activity:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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

      <div className="mb-5">
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

      <div className="flex gap-2.5">
        <button
          type="submit"
          disabled={isSubmitting || !title.trim()}
          className="flex-1 bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-gray-900 font-medium py-2.5 px-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow"
        >
          {isSubmitting ? 'Tilføjer...' : 'Tilføj'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200"
        >
          Annuller
        </button>
      </div>
    </form>
  );
}
