'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function InvitePage() {
  const router = useRouter();
  const [inviteUrl, setInviteUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInviteLink();
  }, []);

  const fetchInviteLink = async () => {
    try {
      // Get invite link from public endpoint
      const response = await fetch('/api/invite/public');
      if (response.ok) {
        const data = await response.json();
        setInviteUrl(data.inviteUrl);
      } else {
        setError('Unable to get invite link');
      }
    } catch (error) {
      console.error('Error fetching invite link:', error);
      setError('Failed to load invite link');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
      alert('Invite link copied to clipboard!');
    }
  };

  const handleShare = () => {
    if (inviteUrl && navigator.share) {
      navigator.share({
        title: 'Join our Lisbon Trip!',
        text: 'Join our Lisbon trip planning group!',
        url: inviteUrl,
      });
    } else {
      handleCopy();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Lisbon Trip Invite
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Share this link with your friends to join the trip planning group.
        </p>

        {error ? (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        ) : inviteUrl ? (
          <>
            {/* Big Clickable Join Button */}
            <a
              href={inviteUrl}
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg py-4 px-6 rounded-lg transition-colors text-center mb-4 shadow-lg hover:shadow-xl"
            >
              🎉 Join Lisbon Trip Now
            </a>

            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Or share this link:</p>
              <a
                href={inviteUrl}
                className="text-sm text-blue-600 dark:text-blue-400 break-all font-mono hover:underline"
              >
                {inviteUrl}
              </a>
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={handleCopy}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                📋 Copy Link
              </button>
              <button
                onClick={handleShare}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                📤 Share
              </button>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => router.push('/')}
                className="w-full text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                ← Back to Trip
              </button>
            </div>
          </>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            No invite link available.
          </p>
        )}
      </div>
    </div>
  );
}
