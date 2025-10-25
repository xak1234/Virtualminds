import React from 'react';

interface GangIconProps {
  className?: string;
}

export const GangIcon: React.FC<GangIconProps> = ({ className = 'w-6 h-6' }) => {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
      <circle cx="17" cy="8" r="2" fill="currentColor" opacity="0.7"/>
      <circle cx="7" cy="8" r="2" fill="currentColor" opacity="0.7"/>
    </svg>
  );
};

