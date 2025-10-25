import React from 'react';

export const MicrophoneIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 1.5a3 3 0 00-3 3v7.5a3 3 0 106 0V4.5a3 3 0 00-3-3z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5a7.5 7.5 0 01-15 0M12 18v4" />
  </svg>
);