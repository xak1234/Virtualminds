import React from 'react';

interface FistIconProps {
  className?: string;
}

export const FistIcon: React.FC<FistIconProps> = ({ className = 'w-6 h-6' }) => {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Fist/Power icon - clear symbol for gangs */}
      <path d="M10 2c-1.1 0-2 .9-2 2v5H7c-1.1 0-2 .9-2 2v2c0 .55-.45 1-1 1H3v2h1c.55 0 1 .45 1 1v2c0 1.1.9 2 2 2h1v2c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2v-2h1c1.1 0 2-.9 2-2v-2c0-.55.45-1 1-1h1v-2h-1c-.55 0-1-.45-1-1v-2c0-1.1-.9-2-2-2h-1V4c0-1.1-.9-2-2-2h-2zm0 2h2v7h2V4h2v7h2v2h-2v8h-6v-8H8v-2h2V4z"/>
    </svg>
  );
};

