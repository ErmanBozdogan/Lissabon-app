'use client';

import { useState, useRef, useEffect } from 'react';
import { Reaction } from '@/types';

interface ReactionViewerProps {
  reaction: Reaction;
  onClose: () => void;
}

export default function ReactionViewer({ reaction, onClose }: ReactionViewerProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div
      ref={popoverRef}
      className="absolute z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-3 min-w-[200px] max-w-[300px]"
      style={{
        bottom: 'calc(100% + 8px)',
        left: '50%',
        transform: 'translateX(-50%)',
      }}
    >
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
        <span className="text-xl">{reaction.emoji}</span>
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-50">
          {reaction.users.length} {reaction.users.length === 1 ? 'person' : 'people'}
        </span>
      </div>
      <div className="space-y-1">
        {reaction.users.map((userName, index) => (
          <div
            key={index}
            className="text-sm text-gray-700 dark:text-gray-300 py-1 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            {userName}
          </div>
        ))}
      </div>
    </div>
  );
}
