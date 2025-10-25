import React from 'react';
import { UserIcon } from './icons/UserIcon';

interface UserAvatarProps {
  username?: string | null;
  profilePicture?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showRing?: boolean;
  ringColor?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  username,
  profilePicture,
  size = 'md',
  className = '',
  showRing = false,
  ringColor = 'ring-blue-500',
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const iconPadding = {
    sm: 'p-0.5',
    md: 'p-1',
    lg: 'p-1.5',
  };

  const ringClasses = showRing ? `ring-2 ${ringColor}` : '';

  // Generate a color based on username for consistency
  const getUserColor = (name: string | null | undefined) => {
    if (!name) return 'bg-gray-500';
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-cyan-500',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (profilePicture) {
    return (
      <img
        src={profilePicture}
        alt={username || 'User'}
        className={`${sizeClasses[size]} rounded-full object-cover ${ringClasses} ${className}`}
      />
    );
  }

  if (username) {
    // Show initials with colored background
    return (
      <div
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center text-white font-semibold ${getUserColor(username)} ${ringClasses} ${className}`}
        style={{ fontSize: size === 'sm' ? '0.625rem' : size === 'md' ? '0.75rem' : '0.875rem' }}
      >
        {getInitials(username)}
      </div>
    );
  }

  // Default user icon
  return (
    <div className={`${sizeClasses[size]} rounded-full flex items-center justify-center bg-gray-200 dark:bg-gray-700 ${ringClasses} ${className}`}>
      <UserIcon className={`${sizeClasses[size]} ${iconPadding[size]} text-gray-600 dark:text-gray-400`} />
    </div>
  );
};
