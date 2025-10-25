import React, { useState, useEffect } from 'react';
import type { Personality } from '../types';
import { CloseIcon } from './icons/CloseIcon';
import { UploadIcon } from './icons/UploadIcon';
import { CogIcon } from './icons/CogIcon';

interface PersonalityLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  allPersonalities: Personality[];
  onLoad: (selectedPersonalities: Personality[]) => void;
  loadedPersonalities?: Personality[]; // Currently loaded personalities to detect duplicates
  onFileUpload?: (file: File) => void; // For importing from server
  onOpenSlots?: () => void; // Open quick slots (load/unload)
}

export const PersonalityLoadModal: React.FC<PersonalityLoadModalProps> = ({ isOpen, onClose, allPersonalities, onLoad, loadedPersonalities = [], onFileUpload, onOpenSlots }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [serverPersonalities, setServerPersonalities] = useState<string[]>([]);
  const [loadingServer, setLoadingServer] = useState(false);
  const [importingFile, setImportingFile] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset selections when modal opens
      setSelectedIds([]);
      // Load server personalities
      loadServerPersonalities();
    }
  }, [isOpen]);

  const loadServerPersonalities = async () => {
    setLoadingServer(true);
    try {
      // List of known personality files in public/ident/
      const knownFiles = [
        'Adolf.zip',
        'Donald_Trump.zip',
        'Gypsy_Lee_Rose.zip',
        'Huntley.zip',
        'jill_dando.zip',
        'Jimmy_Savile.zip',
        'Josef_Fitzel.zip',
        'Karen_Matthews.zip',
        'Keir_Starmer.zip',
        'Lucy_Letby.zip',
        'PrinceAndrew.zip',
        'Rose_West.zip',
        'Ted_Bundy.zip',
        'Tony_Blair.zip',
        'Yorkshire_Ripper.zip',
        '__Idi_Amin_Dada_Oumee__.zip'
      ];
      setServerPersonalities(knownFiles);
    } catch (error) {
      console.error('[PERSONALITY LOAD] Error loading server personalities:', error);
    } finally {
      setLoadingServer(false);
    }
  };

  const handleImportFromServer = async (filename: string) => {
    if (!onFileUpload) {
      console.error('[PERSONALITY LOAD] onFileUpload not provided');
      return;
    }

    setImportingFile(filename);
    try {
      // Fetch the file from public/ident/
      const response = await fetch(`/ident/${filename}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${filename}`);
      }

      // Convert response to blob and create File object
      const blob = await response.blob();
      const file = new File([blob], filename, { type: 'application/zip' });

      // Pass to parent's file upload handler
      await onFileUpload(file);
      
      console.log(`[PERSONALITY LOAD] Successfully imported ${filename} from server`);
    } catch (error) {
      console.error(`[PERSONALITY LOAD] Error importing ${filename}:`, error);
      alert(`Failed to import ${filename}. Please try again.`);
    } finally {
      setImportingFile(null);
    }
  };

  const handleToggle = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedIds(allPersonalities.map(p => p.id));
  };
  
  const handleSelectNone = () => {
      setSelectedIds([]);
  }

  const handleLoad = () => {
    onLoad(allPersonalities.filter(p => selectedIds.includes(p.id)));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div
        className="bg-light-panel dark:bg-base-800 rounded-lg shadow-xl w-full max-w-lg border border-light-border dark:border-base-700 flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-light-border dark:border-base-700 relative">
          <h2 className="text-2xl font-bold text-light-text dark:text-gray-100 text-center">Load Personalities</h2>
          <p className="text-sm text-light-text-secondary dark:text-gray-400 text-center">Select which personalities to load for this session.</p>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-400"
            aria-label="Close"
            title="Close"
          >
            <CloseIcon className="w-5 h-5 text-red-500 hover:text-red-600" />
          </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto">
            {/* Quick Slots Section */}
            {onOpenSlots && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-light-text dark:text-gray-200">
                    🎛️ Quick Slots
                  </h3>
                </div>
                <button
                  onClick={onOpenSlots}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm bg-purple-600 hover:bg-purple-700 text-white transition-colors"
                >
                  <CogIcon className="w-4 h-4" />
                  <span>Open Slots (Load / Unload)</span>
                </button>
                <div className="border-t border-light-border dark:border-base-700 pt-4" />
              </div>
            )}

            {/* Server Personalities Section */}
            {onFileUpload && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-light-text dark:text-gray-200">
                    📦 Import from Server
                  </h3>
                  <span className="text-xs text-light-text-secondary dark:text-gray-400">
                    {serverPersonalities.length} available
                  </span>
                </div>
                
                {loadingServer ? (
                  <p className="text-center text-light-text-secondary dark:text-gray-400 py-4">
                    Loading server personalities...
                  </p>
                ) : serverPersonalities.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {serverPersonalities.map(filename => {
                      const displayName = filename.replace('.zip', '').replace(/_/g, ' ');
                      const isImporting = importingFile === filename;
                      const alreadyExists = allPersonalities.some(
                        p => p.name.toLowerCase().replace(/\s+/g, '_') === filename.toLowerCase().replace('.zip', '')
                      );
                      
                      return (
                        <button
                          key={filename}
                          onClick={() => handleImportFromServer(filename)}
                          disabled={isImporting || alreadyExists}
                          className={`flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                            alreadyExists
                              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                              : isImporting
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 cursor-wait'
                              : 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-700 dark:text-green-300'
                          }`}
                        >
                          <span className="flex items-center gap-2 flex-1 truncate">
                            {isImporting ? (
                              <>
                                <span className="animate-spin">⏳</span>
                                <span>Importing...</span>
                              </>
                            ) : alreadyExists ? (
                              <>
                                <span>✓</span>
                                <span>{displayName}</span>
                              </>
                            ) : (
                              <>
                                <UploadIcon className="w-4 h-4" />
                                <span>{displayName}</span>
                              </>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-light-text-secondary dark:text-gray-400 py-4">
                    No server personalities available
                  </p>
                )}
                
                <div className="border-t border-light-border dark:border-base-700 pt-4">
                  <h3 className="text-lg font-semibold text-light-text dark:text-gray-200 mb-3">
                    📋 Your Personalities
                  </h3>
                </div>
              </div>
            )}
            
            {allPersonalities.length > 0 ? (
                allPersonalities.map(p => {
                    const isAlreadyLoaded = loadedPersonalities.some(
                        loaded => loaded.name.toLowerCase().trim() === p.name.toLowerCase().trim()
                    );
                    return (
                     <label 
                        key={p.id} 
                        className={`flex items-center p-3 rounded-md cursor-pointer ${
                            isAlreadyLoaded 
                                ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700' 
                                : 'hover:bg-black/5 dark:hover:bg-base-700'
                        }`}
                    >
                        <input 
                            type="checkbox" 
                            checked={selectedIds.includes(p.id)} 
                            onChange={() => handleToggle(p.id)} 
                            className="h-5 w-5 rounded border-gray-400 text-primary bg-base-900 focus:ring-primary"
                            disabled={isAlreadyLoaded}
                        />
                        <span className={`ml-3 font-medium ${
                            isAlreadyLoaded 
                                ? 'text-yellow-700 dark:text-yellow-400 line-through' 
                                : 'text-green-600 dark:text-green-400'
                        }`}>
                            {p.name}
                            {isAlreadyLoaded && <span className="ml-2 text-xs">✓ Already Loaded</span>}
                        </span>
                    </label>
                    );
                })
            ) : (
                <p className="text-center text-light-text-secondary dark:text-gray-500 py-8">
                    You haven't created or uploaded any personalities yet.
                </p>
            )}
        </div>

        <div className="p-4 bg-light-bg dark:bg-base-900 border-t border-light-border dark:border-base-700 mt-auto flex justify-between items-center rounded-b-lg">
            <div className="flex gap-2">
                <button
                    onClick={handleSelectAll}
                    disabled={allPersonalities.length === 0}
                    className="px-4 py-2 text-sm bg-black/10 dark:bg-base-700 text-light-text dark:text-white rounded-md hover:bg-black/20 dark:hover:bg-base-600 transition-colors disabled:opacity-50"
                >
                    Select All
                </button>
                 <button
                    onClick={handleSelectNone}
                    disabled={allPersonalities.length === 0}
                    className="px-4 py-2 text-sm bg-black/10 dark:bg-base-700 text-light-text dark:text-white rounded-md hover:bg-black/20 dark:hover:bg-base-600 transition-colors disabled:opacity-50"
                >
                    Select None
                </button>
            </div>
            <button
                onClick={handleLoad}
                className="px-6 py-2 bg-primary text-white rounded-md hover:bg-blue-600 transition-colors"
            >
                Load Session
            </button>
        </div>
      </div>
    </div>
  );
};