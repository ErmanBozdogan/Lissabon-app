'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function JoinLinkPage() {
  const router = useRouter();
  const [inviteUrl, setInviteUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInviteLink();
  }, []);

  const fetchInviteLink = async () => {
    try {
      const response = await fetch('/api/invite/public');
      if (response.ok) {
        const data = await response.json();
        setInviteUrl(data.inviteUrl);
        // Automatically redirect to join page after a brief moment
        setTimeout(() => {
          window.location.href = data.inviteUrl;
        }, 500);
      }
    } catch (error) {
      console.error('Error fetching invite link:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Redirecting to join page...</p>
        </div>
      </div>
    );
  }

  // If we have the URL, show a clickable link as fallback
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Join Lisbon Trip
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Click the button below to join the trip planning group.
        </p>
        {inviteUrl && (
          <a
            href={inviteUrl}
            className="inline-block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg py-4 px-6 rounded-lg transition-colors shadow-lg hover:shadow-xl"
          >
            🎉 Join Now
          </a>
        )}
      </div>
    </div>
  );
}
