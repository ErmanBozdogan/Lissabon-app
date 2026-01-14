'use client';

import { Activity, Vote } from '@/types';
import { useState } from 'react';
import EditActivityForm from './EditActivityForm';

interface ActivityCardProps {
  activity: Activity;
  currentUserId: string;
  onVote: (activityId: string, vote: 'yes' | 'no') => void;
  onDelete: (activityId: string) => void;
  onEdit: (activityId: string, updates: Partial<Activity>) => Promise<void>;
}

export default function ActivityCard({ activity, currentUserId, onVote, onDelete, onEdit }: ActivityCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Get current user name from localStorage for vote checking
  const currentUserName = typeof window !== 'undefined' ? (localStorage.getItem('user_name') || 'User') : 'User';
  // Check vote by userName (unique identifier) instead of userId
  const userVote = activity.votes.find(v => v.userName === currentUserName);
  const yesVotes = activity.votes.filter(v => v.vote === 'yes').length;
  const noVotes = activity.votes.filter(v => v.vote === 'no').length;

  const handleVote = (vote: 'yes' | 'no') => {
    if (userVote?.vote === vote) {
      // Remove vote if clicking the same vote
      onVote(activity.id, vote);
    } else {
      onVote(activity.id, vote);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this activity?')) {
      setIsDeleting(true);
      try {
        await onDelete(activity.id);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleEdit = async (activityId: string, updates: Partial<Activity>) => {
    await onEdit(activityId, updates);
    setIsEditing(false);
  };

  const categoryEmoji: Record<string, string> = {
    restaurant: '🍽️',
    brunch: '🥐',
    sightseeing: '🏛️',
    bar: '🍻',
    cafe: '☕',
    experience: '🎭',
    other: '📍',
  };

  // Check if location is a URL - more robust detection
  const isUrl = (text: string): boolean => {
    if (!text) return false;
    
    const trimmed = text.trim();
    if (!trimmed) return false;
    
    // Remove any leading/trailing whitespace and normalize
    const normalized = trimmed.replace(/^\s+|\s+$/g, '');
    
    // Check for http:// or https:// (case insensitive)
    if (/^https?:\/\//i.test(normalized)) {
      return true;
    }
    
    // Check for www. prefix (case insensitive)
    if (/^www\./i.test(normalized)) {
      return true;
    }
    
    // More comprehensive domain pattern matching
    // Matches: domain.com, subdomain.domain.com, domain.co.uk, etc.
    // Must have at least one dot and look like a valid domain
    const domainPattern = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(\/.*)?$/;
    
    if (domainPattern.test(normalized)) {
      // Exclude emails (contains @ before domain)
      if (normalized.includes('@')) {
        // Check if @ comes before the domain part
        const atIndex = normalized.indexOf('@');
        const domainPart = normalized.substring(atIndex + 1);
        // If the part after @ is still a valid domain, it's an email, not a URL
        if (domainPattern.test(domainPart)) {
          return false;
        }
      }
      
      // Exclude file paths
      if (normalized.startsWith('/') || normalized.startsWith('./') || normalized.startsWith('../')) {
        return false;
      }
      
      // Exclude if it looks like just a file extension
      if (/^\.\w+$/.test(normalized)) {
        return false;
      }
      
      return true;
    }
    
    return false;
  };

  // Format location URL (add https:// if missing, clean up)
  const formatUrl = (text: string): string => {
    if (!text) return '';
    
    const trimmed = text.trim();
    if (!trimmed) return '';
    
    // Remove any leading/trailing whitespace
    const normalized = trimmed.replace(/^\s+|\s+$/g, '');
    
    // If it already has http:// or https://, return as is
    if (/^https?:\/\//i.test(normalized)) {
      return normalized;
    }
    
    // Add https:// for www. or domain patterns
    return `https://${normalized}`;
  };

  // Render location as link or text
  const renderLocation = () => {
    if (!activity.location) return null;
    
    // Normalize the location text - handle any whitespace issues
    const locationText = String(activity.location).trim();
    if (!locationText) return null;
    
    // Check if it's a URL (with improved detection)
    const isLocationUrl = isUrl(locationText);
    
    if (isLocationUrl) {
      const url = formatUrl(locationText);
      // Double-check that we have a valid URL
      if (!url) return null;
      
      return (
        <div className="mb-2.5">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline break-all transition-colors font-medium cursor-pointer"
            onClick={(e) => {
              // Ensure the link opens
              e.stopPropagation();
              // Verify URL is valid before navigating
              try {
                new URL(url);
              } catch {
                e.preventDefault();
                console.error('Invalid URL:', url);
              }
            }}
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span className="break-all">{locationText}</span>
            <svg className="w-3 h-3 flex-shrink-0 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      );
    }
    
    // Not a URL, render as plain text
    return (
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2.5 flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        {locationText}
      </p>
    );
  };

  if (isEditing) {
    return (
      <EditActivityForm
        activity={activity}
        onSubmit={handleEdit}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900/50 rounded-2xl p-5 mb-4 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-800/50">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2.5 mb-2">
            {activity.category && (
              <span className="text-2xl">{categoryEmoji[activity.category] || '📍'}</span>
            )}
            <h3 className="font-semibold text-base text-gray-900 dark:text-gray-50 leading-tight">
              {activity.title}
            </h3>
          </div>
          {activity.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2.5 leading-relaxed">
              {activity.description}
            </p>
          )}
          {renderLocation()}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            af {activity.creatorName}
          </p>
        </div>
        {activity.creatorId === currentUserId && (
          <div className="flex gap-1.5 ml-3">
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Edit activity"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
              aria-label="Delete activity"
            >
              {isDeleting ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
        <button
          onClick={() => handleVote('yes')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 ${
            userVote?.vote === 'yes'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 shadow-sm'
              : 'bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:text-emerald-600 dark:hover:text-emerald-400'
          }`}
        >
          <span className="text-base">👍</span>
          {yesVotes > 0 && <span>({yesVotes})</span>}
        </button>
        <button
          onClick={() => handleVote('no')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 ${
            userVote?.vote === 'no'
              ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 shadow-sm'
              : 'bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-600 dark:hover:text-rose-400'
          }`}
        >
          <span className="text-base">👎</span>
          {noVotes > 0 && <span>({noVotes})</span>}
        </button>
      </div>
    </div>
  );
}
