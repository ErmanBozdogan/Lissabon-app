'use client';

import { Activity, Reaction, Comment } from '@/types';
import { useState, useRef, useEffect } from 'react';
import EditActivityForm from './EditActivityForm';
import ReactionViewer from './ReactionViewer';

interface ActivityCardProps {
  activity: Activity;
  currentUserId: string;
  onVote: (activityId: string, emoji?: string, type?: 'like' | 'dislike') => Promise<void>;
  onDelete: (activityId: string) => void;
  onEdit: (activityId: string, updates: Partial<Activity>) => Promise<void>;
  onCommentAdd?: (activityId: string, text: string) => Promise<void>;
  onCommentEdit?: (activityId: string, commentId: string, text: string) => Promise<void>;
  onCommentDelete?: (activityId: string, commentId: string) => Promise<void>;
}

const DEFAULT_EMOJIS = ['👍', '👎', '🔥', '🍷', '😂', '🤯'];

const budgetConfig: Record<string, { icons: string; label: string; color: string }> = {
  cheap: { icons: '💸', label: 'Cheap', color: 'text-green-600 dark:text-green-400' },
  medium: { icons: '💸💸', label: 'Medium', color: 'text-yellow-600 dark:text-yellow-400' },
  expensive: { icons: '💸💸💸', label: 'Expensive', color: 'text-red-600 dark:text-red-400' },
};

export default function ActivityCard({ 
  activity, 
  currentUserId, 
  onVote, 
  onDelete, 
  onEdit,
  onCommentAdd,
  onCommentEdit,
  onCommentDelete,
}: ActivityCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState<Reaction | null>(null);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  
  // Get current user name from localStorage
  const currentUserName = typeof window !== 'undefined' ? (localStorage.getItem('user_name') || '') : '';
  
  // Get reactions (new system) or migrate from likes/dislikes
  const reactions = activity.reactions || [];
  const comments = activity.comments || [];
  
  // Legacy support - migrate likes/dislikes to reactions if needed
  const legacyLikes = activity.likes || [];
  const legacyDislikes = activity.dislikes || [];
  
  // Check if user has reacted with each emoji
  const getUserReactions = (emoji: string): boolean => {
    const reaction = reactions.find(r => r.emoji === emoji);
    return reaction ? reaction.users.includes(currentUserName) : false;
  };

  const handleReaction = async (emoji: string) => {
    if (currentUserName && currentUserName !== 'User' && currentUserName.trim() !== '') {
      await onVote(activity.id, emoji);
      setShowEmojiPicker(false);
    } else {
      alert('Error: User name is required. Please log in again.');
    }
  };

  const handleLegacyLike = async () => {
    if (currentUserName && currentUserName !== 'User' && currentUserName.trim() !== '') {
      await onVote(activity.id, undefined, 'like');
    } else {
      alert('Error: User name is required. Please log in again.');
    }
  };

  const handleLegacyDislike = async () => {
    if (currentUserName && currentUserName !== 'User' && currentUserName.trim() !== '') {
      await onVote(activity.id, undefined, 'dislike');
    } else {
      alert('Error: User name is required. Please log in again.');
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

  const handleAddComment = async () => {
    if (!commentText.trim() || !onCommentAdd) return;
    await onCommentAdd(activity.id, commentText.trim());
    setCommentText('');
    setShowCommentForm(false);
  };

  const handleEditComment = async (commentId: string) => {
    if (!editingCommentText.trim() || !onCommentEdit) return;
    await onCommentEdit(activity.id, commentId, editingCommentText.trim());
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?') || !onCommentDelete) return;
    await onCommentDelete(activity.id, commentId);
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

  // Check if location is a URL
  const isUrl = (text: string): boolean => {
    if (!text) return false;
    const trimmed = text.trim();
    if (!trimmed) return false;
    const normalized = trimmed.replace(/^\s+|\s+$/g, '');
    if (/^https?:\/\//i.test(normalized)) return true;
    if (/^www\./i.test(normalized)) return true;
    const domainPattern = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(\/.*)?$/;
    if (domainPattern.test(normalized)) {
      if (normalized.includes('@')) {
        const atIndex = normalized.indexOf('@');
        const domainPart = normalized.substring(atIndex + 1);
        if (domainPattern.test(domainPart)) return false;
      }
      if (normalized.startsWith('/') || normalized.startsWith('./') || normalized.startsWith('../')) return false;
      if (/^\.\w+$/.test(normalized)) return false;
      return true;
    }
    return false;
  };

  const formatUrl = (text: string): string => {
    if (!text) return '';
    const trimmed = text.trim();
    if (!trimmed) return '';
    const normalized = trimmed.replace(/^\s+|\s+$/g, '');
    if (/^https?:\/\//i.test(normalized)) return normalized;
    return `https://${normalized}`;
  };

  const renderLocation = () => {
    if (!activity.location) return null;
    const locationText = String(activity.location).trim();
    if (!locationText) return null;
    const isLocationUrl = isUrl(locationText);
    
    if (isLocationUrl) {
      const url = formatUrl(locationText);
      if (!url) return null;
      return (
        <div className="mb-2.5">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline break-all transition-colors font-medium cursor-pointer"
            onClick={(e) => e.stopPropagation()}
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

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
      // Close reaction viewer when clicking outside
      const target = event.target as HTMLElement;
      if (!target.closest('.reaction-viewer-container')) {
        setSelectedReaction(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          {activity.budget && (
            <div className="flex items-center gap-1.5 mb-2 mt-2">
              <span className="text-base">{budgetConfig[activity.budget].icons}</span>
              <span className={`text-xs font-medium ${budgetConfig[activity.budget].color}`}>
                {budgetConfig[activity.budget].label}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-base">
              {(activity.status || 'tentative') === 'confirmed' ? '🟢' : '🟡'}
            </span>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 capitalize">
              {(activity.status || 'tentative') === 'confirmed' ? 'Confirmed' : 'Tentative'}
            </span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            af {activity.creatorName}
          </p>
        </div>
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
      </div>

      {/* Reactions Section */}
      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex-wrap">
        {/* Show existing reactions */}
        {reactions.map((reaction, index) => {
          const hasReacted = reaction.users.includes(currentUserName);
          return (
            <div key={index} className="relative reaction-viewer-container">
              <button
                onMouseEnter={() => setSelectedReaction(reaction)}
                onMouseLeave={() => setSelectedReaction(null)}
                onTouchStart={(e) => {
                  e.preventDefault();
                  setSelectedReaction(selectedReaction === reaction ? null : reaction);
                }}
                onClick={() => handleReaction(reaction.emoji)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  hasReacted
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 shadow-sm'
                    : 'bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span className="text-base">{reaction.emoji}</span>
                <span>({reaction.users.length})</span>
              </button>
              {selectedReaction === reaction && (
                <ReactionViewer reaction={reaction} onClose={() => setSelectedReaction(null)} />
              )}
            </div>
          );
        })}
        
        {/* Legacy likes/dislikes (if no reactions exist yet) */}
        {reactions.length === 0 && (
          <>
            {legacyLikes.length > 0 && (
              <button
                onClick={handleLegacyLike}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  legacyLikes.includes(currentUserName)
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 shadow-sm'
                    : 'bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
                }`}
              >
                <span className="text-base">👍</span>
                <span>({legacyLikes.length})</span>
              </button>
            )}
            {legacyDislikes.length > 0 && (
              <button
                onClick={handleLegacyDislike}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  legacyDislikes.includes(currentUserName)
                    ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 shadow-sm'
                    : 'bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-rose-50 dark:hover:bg-rose-950/20'
                }`}
              >
                <span className="text-base">👎</span>
                <span>({legacyDislikes.length})</span>
              </button>
            )}
          </>
        )}

        {/* Emoji picker button */}
        <div className="relative" ref={emojiPickerRef}>
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <span className="text-base">😀</span>
            <span>Add</span>
          </button>
          {showEmojiPicker && (
            <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-2 z-50">
              <div className="flex gap-2 flex-wrap">
                {DEFAULT_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className="text-2xl hover:scale-125 transition-transform p-1"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Comments Section */}
      {onCommentAdd && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          {comments.length > 0 && (
            <div className="space-y-3 mb-4">
              {comments.map((comment) => (
                <div key={comment.id} className="text-sm">
                  {editingCommentId === comment.id ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editingCommentText}
                        onChange={(e) => setEditingCommentText(e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-50 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleEditComment(comment.id);
                          } else if (e.key === 'Escape') {
                            setEditingCommentId(null);
                            setEditingCommentText('');
                          }
                        }}
                      />
                      <button
                        onClick={() => handleEditComment(comment.id)}
                        className="px-3 py-1.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingCommentId(null);
                          setEditingCommentText('');
                        }}
                        className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between group">
                      <div className="flex-1">
                        <span className="font-medium text-gray-900 dark:text-gray-50">{comment.userName}</span>
                        <span className="text-gray-600 dark:text-gray-400 ml-2">{comment.text}</span>
                      </div>
                      {comment.userName === currentUserName && onCommentEdit && onCommentDelete && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditingCommentId(comment.id);
                              setEditingCommentText(comment.text);
                            }}
                            className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {showCommentForm ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-50 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddComment();
                  } else if (e.key === 'Escape') {
                    setShowCommentForm(false);
                    setCommentText('');
                  }
                }}
              />
              <button
                onClick={handleAddComment}
                disabled={!commentText.trim()}
                className="px-3 py-1.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm disabled:opacity-50"
              >
                Post
              </button>
              <button
                onClick={() => {
                  setShowCommentForm(false);
                  setCommentText('');
                }}
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowCommentForm(true)}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-50"
            >
              Add a comment...
            </button>
          )}
        </div>
      )}
    </div>
  );
}
