import React from 'react';
import { CloseIcon } from './icons/CloseIcon';
import { PlusIcon } from './icons/PlusIcon';
import { CogIcon } from './icons/CogIcon';

interface DiscoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCreate: () => void;
  onOpenSlots?: () => void;
}

export const DiscoverModal: React.FC<DiscoverModalProps> = ({
  isOpen,
  onClose,
  onOpenCreate,
  onOpenSlots,
}) => {
  if (!isOpen) return null;

  const handleCreateClick = () => {
    onClose();
    onOpenCreate();
  };


  const handleSlotsClick = () => {
    onClose();
    if (onOpenSlots) onOpenSlots();
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-light-panel dark:bg-base-800 rounded-lg shadow-xl w-full max-w-xl border border-light-border dark:border-base-700 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-light-border dark:border-base-700 relative">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-light-text dark:text-gray-100">Discover Minds</h2>
            <p className="text-sm text-light-text-secondary dark:text-gray-400 mt-1">
              Create a new personality or load from your saved collection
            </p>
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-400"
            aria-label="Close"
            title="Close"
          >
            <CloseIcon className="w-5 h-5 text-red-500 hover:text-red-600" />
          </button>
        </div>

        {/* Content - Option cards */}
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
            {/* Create New Card */}
            <button
              onClick={handleCreateClick}
              className="group relative bg-gradient-to-br from-primary/10 to-primary/5 dark:from-accent/10 dark:to-accent/5 hover:from-primary/20 hover:to-primary/10 dark:hover:from-accent/20 dark:hover:to-accent/10 border-2 border-primary/30 dark:border-accent/30 hover:border-primary dark:hover:border-accent rounded-xl p-4 xs:p-5 sm:p-6 flex flex-col items-center justify-center gap-2 xs:gap-3 transition-all duration-300 hover:scale-105 hover:shadow-xl"
            >
              <div className="w-12 h-12 xs:w-14 xs:h-14 sm:w-16 sm:h-16 bg-primary dark:bg-accent rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <PlusIcon className="w-6 h-6 xs:w-7 xs:h-7 sm:w-8 sm:h-8 text-white dark:text-base-900" />
              </div>
              <div className="text-center">
                <h3 className="text-lg xs:text-xl font-bold text-light-text dark:text-gray-100 mb-1 xs:mb-2">Create New</h3>
                <p className="text-xs xs:text-sm text-light-text-secondary dark:text-gray-400">
                  Build a Mind from scratch using AI research
                </p>
              </div>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:to-primary/10 dark:group-hover:from-accent/5 dark:group-hover:to-accent/10 transition-all duration-300" />
            </button>

            {/* Quick Slots Card */}
            <button
              onClick={handleSlotsClick}
              className="group relative bg-gradient-to-br from-purple-500/10 to-purple-500/5 hover:from-purple-500/20 hover:to-purple-500/10 border-2 border-purple-500/30 hover:border-purple-500 rounded-xl p-4 xs:p-5 sm:p-6 flex flex-col items-center justify-center gap-2 xs:gap-3 transition-all duration-300 hover:scale-105 hover:shadow-xl"
            >
              <div className="w-12 h-12 xs:w-14 xs:h-14 sm:w-16 sm:h-16 bg-purple-600 dark:bg-purple-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <CogIcon className="w-6 h-6 xs:w-7 xs:h-7 sm:w-8 sm:h-8 text-white" />
              </div>
              <div className="text-center">
                <h3 className="text-lg xs:text-xl font-bold text-light-text dark:text-gray-100 mb-1 xs:mb-2">Slots</h3>
                <p className="text-xs xs:text-sm text-light-text-secondary dark:text-gray-400">
                  Load or Unload Minds saved to quick slots
                </p>
              </div>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-500/0 to-purple-500/0 group-hover:from-purple-500/5 group-hover:to-purple-500/10 transition-all duration-300" />
            </button>
          </div>
        </div>

        {/* Footer hint */}
        <div className="px-6 pb-4">
          <p className="text-xs text-center text-light-text-secondary dark:text-gray-500">
            Tip: You can also import .zip files directly from the Import screen
          </p>
        </div>
      </div>
    </div>
  );
};

