import React, { useEffect, useMemo, useState, useRef } from 'react';
import type { Personality, ModelConfig } from '../types';
import { PERSONALITY_SLOTS_STORAGE_KEY, DEFAULT_CONFIG } from '../constants';
import { CloseIcon } from './icons/CloseIcon';
import { CogIcon } from './icons/CogIcon';

interface PersonalitySlotsModalProps {
  isOpen: boolean;
  mode: 'load' | 'save';
  saveCandidate?: Personality | null;
  onClose: () => void;
  onLoad: (personality: Personality) => void; // legacy: used when mode==='save' or direct load
  loadedIds?: string[]; // ids that are currently active/loaded
  onToggleLoad?: (personality: Personality, load: boolean) => void; // toggle load/unload in 'load' mode
  loadedPersonalities?: Personality[]; // Currently loaded personalities to check for name duplicates
  currentUser?: string | null; // Current logged-in user (for admin features)
  onOpenConfig?: (personalityId: string) => void; // callback to open personality config panel
}

interface SlotData extends Personality {}

type SlotsArray = Array<SlotData | null>;

const SLOT_COUNT = 15;

const loadSlots = (): SlotsArray => {
  try {
    const raw = localStorage.getItem(PERSONALITY_SLOTS_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as SlotsArray) : [];
    // Normalize to fixed size array of length SLOT_COUNT
    const slots: SlotsArray = Array.from({ length: SLOT_COUNT }, (_, i) => parsed[i] ?? null);
    return slots;
  } catch (e) {
    console.warn('Failed to read personality slots from storage:', e);
    return Array.from({ length: SLOT_COUNT }, () => null);
  }
};

const saveSlots = (slots: SlotsArray) => {
  try {
    localStorage.setItem(PERSONALITY_SLOTS_STORAGE_KEY, JSON.stringify(slots));
    // Dispatch custom event to notify of slots update
    window.dispatchEvent(new Event('personalitySlotsUpdated'));
  } catch (e) {
    console.error('Failed to save personality slots:', e);
  }
};

declare const JSZip: any;

// UUID utility matching App.tsx behavior
const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) {
    return (crypto as any).randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const PersonalitySlotsModal: React.FC<PersonalitySlotsModalProps> = ({ isOpen, mode, saveCandidate, onClose, onLoad, loadedIds = [], onToggleLoad, loadedPersonalities = [], currentUser = null, onOpenConfig }) => {
  const [slots, setSlots] = useState<SlotsArray>(() => loadSlots());
  const [importSaveCandidate, setImportSaveCandidate] = useState<Personality | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const effectiveMode: 'load' | 'save' = importSaveCandidate ? 'save' : mode;

  const title = effectiveMode === 'load' ? 'Quick Minds' : 'Save to Slot';
  const subtitle = importSaveCandidate
    ? `Imported "${importSaveCandidate.name}". Click a slot to save it.`
    : effectiveMode === 'load'
      ? 'Pick a saved Mind to load.'
      : 'Choose a slot to save this personality for quick access.';

  useEffect(() => {
    if (isOpen) {
      setSlots(loadSlots());
      // Reset local import candidate when reopening modal
      setImportSaveCandidate(null);
    }
  }, [isOpen]);

  const handleClickSlot = (index: number) => {
    if (effectiveMode === 'load') {
      const data = slots[index];
      if (!data) return; // empty slot, do nothing
      // Toggle load/unload and keep window open
      const isLoaded = data && loadedIds.includes(data.id);
      if (onToggleLoad) {
        onToggleLoad(data, !isLoaded);
      } else {
        // Fallback: direct load via onLoad if toggler not provided
        onLoad(data);
      }
      return;
    }
    // save mode
    const candidate = importSaveCandidate || saveCandidate;
    if (!candidate) return;
    // Auto-proceed: Always overwrite without confirmation

    const updated: SlotsArray = [...slots];
    updated[index] = candidate;
    setSlots(updated);
    saveSlots(updated);
    setImportSaveCandidate(null);
    onClose();
  };

  const handleClearSlot = (e: React.MouseEvent, index: number) => {
    // Confirmation is now handled inline in the button onClick
    e.stopPropagation();
    const updated: SlotsArray = [...slots];
    updated[index] = null;
    setSlots(updated);
    saveSlots(updated);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const parseZipToPersonality = async (file: File): Promise<Personality> => {
    const zip = new JSZip();
    const content = await zip.loadAsync(file);
    const knowledgeFile = content.file('knowledge.txt') || content.file('knowledge.md');
    const promptFile = content.file('prompt.txt');
    const configFile = content.file('config.json');
    const imageFiles = content.file(/profile\.(png|jpg|jpeg|gif|webp)$/i);
    const imageFile = imageFiles && imageFiles.length > 0 ? imageFiles[0] : undefined as any;

    if (!knowledgeFile || !promptFile) {
      throw new Error('ZIP must contain at least knowledge.txt/md and prompt.txt');
    }

    const knowledge = await knowledgeFile.async('string');
    const prompt = await promptFile.async('string');

    let parsedConfig: Partial<ModelConfig & { ttsEnabled: boolean }> = {};
    if (configFile) {
      try {
        const configStr = await configFile.async('string');
        parsedConfig = JSON.parse(configStr);
      } catch (e) {
        console.warn('Could not parse config.json, using defaults.');
      }
    }

    let profileImage: string | undefined = undefined;
    if (imageFile) {
      try {
        const base64 = await (imageFile as any).async('base64');
        const mimeType = `image/${(imageFile as any).name.split('.').pop()}`;
        profileImage = `data:${mimeType};base64,${base64}`;
      } catch (e) {
        console.warn('Could not parse profile image from zip.');
      }
    }

    const ttsEnabled = (parsedConfig as any).ttsEnabled || false;
    const { ttsEnabled: _, ...modelParams } = parsedConfig as any;
    const finalConfig: ModelConfig = { ...DEFAULT_CONFIG, ...modelParams };

    const newPersonality: Personality = {
      id: generateUUID(),
      name: file.name.replace('.zip', ''),
      knowledge,
      prompt,
      config: finalConfig,
      visiblePersonalityIds: [],
      ttsEnabled: ttsEnabled,
      profileImage,
    };
    return newPersonality;
  };

  const handleStockMindsClick = async () => {
    try {
      // Get list of stock personalities from /public/personalities folder
      const stockPersonalities = [
        'Adolf.zip',
        'analface.zip', 
        'Dahmer_.zip',
        'Donald_Trump.zip',
        'fredwest.zip',
        'Gypsy_Rose.zip',
        'Huntley.zip',
        'Idi_Amin.zip',
        'jill_dando.zip',
        'Jimmy_Savile.zip',
        'Josef_Fitzel.zip',
        'Karen_Matthews.zip',
        'Katie_Price.zip',
        'Keir_Starmer.zip',
        'Lucy_Letby.zip',
        'Maxine_Carr.zip',
        'PrinceAndrew.zip',
        'Rose_West.zip',
        'StinkDick.zip',
        'Ted_Bundy.zip',
        'Tony_Blair.zip',
        'Yorkshire_Ripper.zip'
      ];

      let workingSlots: SlotsArray = [...slots];
      if (workingSlots.length === 0) {
        workingSlots = Array.from({ length: SLOT_COUNT }, () => null);
      }

      let loadedCount = 0;
      let skippedCount = 0;

      for (const filename of stockPersonalities) {
        try {
          // Find next available slot
          const availableSlotIndex = workingSlots.findIndex(slot => slot === null);
          if (availableSlotIndex === -1) {
            console.log('No more available slots for stock personalities');
            break;
          }

          // Fetch the ZIP file from public/personalities folder
          const response = await fetch(`/personalities/${filename}`);
          if (!response.ok) {
            console.warn(`Failed to fetch ${filename}: ${response.statusText}`);
            skippedCount++;
            continue;
          }

          const blob = await response.blob();
          const file = new File([blob], filename, { type: 'application/zip' });
          
          // Parse the ZIP file to create personality
          const personality = await parseZipToPersonality(file);
          
          // Check if personality with same name already exists in slots or loaded personalities
          const nameExists = workingSlots.some(slot => 
            slot && slot.name.toLowerCase().trim() === personality.name.toLowerCase().trim()
          ) || loadedPersonalities.some(loaded => 
            loaded.name.toLowerCase().trim() === personality.name.toLowerCase().trim()
          );

          if (nameExists) {
            console.log(`Skipping ${personality.name} - already exists`);
            skippedCount++;
            continue;
          }

          // Add to available slot
          workingSlots[availableSlotIndex] = personality;
          loadedCount++;

        } catch (err) {
          console.error(`Failed to load stock personality ${filename}:`, err);
          skippedCount++;
        }
      }

      // Update slots
      setSlots(workingSlots);
      saveSlots(workingSlots);

      // Show result message
      if (loadedCount === 0 && skippedCount === 0) {
        console.log('No stock personalities were loaded.');
      } else if (loadedCount === 0) {
        console.log(`All stock personalities were skipped (${skippedCount} already exist or failed to load).`);
      } else {
        console.log(`Loaded ${loadedCount} stock personalit${loadedCount !== 1 ? 'ies' : 'y'} into slots${skippedCount > 0 ? ` (${skippedCount} skipped)` : ''}.`);
      }

    } catch (error) {
      console.error('Failed to load stock personalities:', error);
    }
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Work on a local copy so multiple files can be inserted sequentially
    let workingSlots: SlotsArray = [...slots];
    if (workingSlots.length === 0) {
      workingSlots = Array.from({ length: SLOT_COUNT }, () => null);
    }
    let overwriteIndex = workingSlots.length - 1;

    const fileList = Array.from(files);
    for (const file of fileList) {
      try {
        const personality = await parseZipToPersonality(file);

        // Find next available slot or overwrite from the end if full (decrement per file)
        let indexToUse = workingSlots.findIndex((s) => s === null);
        if (indexToUse === -1) {
          indexToUse = overwriteIndex;
          overwriteIndex = Math.max(0, overwriteIndex - 1);
        }

        workingSlots[indexToUse] = personality;

        // Load the personality immediately
        onLoad(personality);
      } catch (err) {
        console.error(`Failed to import ${file.name}:`, err);
      }
    }

    setSlots(workingSlots);
    saveSlots(workingSlots);

    // Keep the modal open so the user can continue importing/managing slots
    e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" 
      onClick={(e) => {
        // Only close if clicking directly on the overlay, not on child elements
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-light-panel dark:bg-base-800 rounded-lg shadow-xl w-full max-w-2xl border border-light-border dark:border-base-700 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-light-border dark:border-base-700 relative">
          <h2 className="text-2xl font-bold text-light-text dark:text-gray-100 text-center">{title}</h2>
          <p className="text-sm text-light-text-secondary dark:text-gray-400 text-center">{subtitle}</p>
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <input ref={fileInputRef} type="file" accept=".zip" multiple className="hidden" onChange={handleImportFileChange} />
            <button
              onClick={handleImportClick}
              className="px-3 py-1 rounded-md text-sm bg-black/10 dark:bg-base-700 text-light-text dark:text-gray-200 hover:bg-black/20 dark:hover:bg-base-600"
              title="Import one or more personality ZIP files to save into slots"
            >
              Import .zip(s)
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-400"
              aria-label="Close"
              title="Close"
            >
              <CloseIcon className="w-5 h-5 text-red-500 hover:text-red-600" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-3 overflow-y-auto">
          {slots.map((slot, idx) => {
            const isLoaded = !!(slot && loadedIds.includes(slot.id));
            // Only flag as duplicate if there's a DIFFERENT personality with the same name
            const isDuplicateName = !!(slot && loadedPersonalities.some(
              loaded => loaded.id !== slot.id && loaded.name.toLowerCase().trim() === slot.name.toLowerCase().trim()
            ));
            const showAsLoaded = isLoaded || isDuplicateName;
            
            return (
            <div
              key={idx}
              className={`relative rounded-lg border p-4 transition-all ${
                showAsLoaded 
                  ? 'border-green-500 dark:border-green-500 bg-green-50 dark:bg-green-900/20' 
                  : slot 
                    ? 'border-light-border dark:border-base-600 bg-light-bg dark:bg-base-900 hover:border-primary dark:hover:border-primary' 
                    : 'border-dashed border-light-border dark:border-base-700 bg-light-bg/50 dark:bg-base-900/50'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Profile Image */}
                <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-light-panel dark:bg-base-800 overflow-hidden flex items-center justify-center border border-light-border dark:border-base-700 relative">
                  {slot?.profileImage ? (
                    <img 
                      src={slot.profileImage} 
                      alt={slot.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center text-xs text-light-text-secondary dark:text-gray-500">
                      <div className="font-bold text-lg">{idx + 1}</div>
                      <div>{importSaveCandidate ? 'Save' : 'Empty'}</div>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-light-text dark:text-gray-200 truncate">
                      {slot ? slot.name : `Slot ${idx + 1} - Empty`}
                    </h3>
                    {showAsLoaded && (
                      <span className="flex-shrink-0 text-xs px-2 py-1 rounded-full bg-green-500 text-white font-semibold">
                        ✓ {isDuplicateName && !isLoaded ? 'DUPLICATE' : 'LOADED'}
                      </span>
                    )}
                  </div>
                  
                  {slot ? (
                    <div className="space-y-1">
                      <p className="text-sm text-light-text-secondary dark:text-gray-400 line-clamp-2">
                        {slot.knowledge.substring(0, 120)}...
                      </p>
                      <div className="flex items-center gap-2 text-xs text-light-text-secondary dark:text-gray-500">
                        <span>🎭 {slot.visiblePersonalityIds.length} connections</span>
                        <span>•</span>
                        <span>🔊 {slot.ttsEnabled ? 'TTS On' : 'TTS Off'}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-light-text-secondary dark:text-gray-400 italic">
                      {importSaveCandidate ? 'Click to save personality here' : 'Empty slot - import or save a personality'}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex-shrink-0 flex flex-col gap-2">
                  {slot ? (
                    <>
                      <button
                        onClick={() => (isLoaded || !isDuplicateName) && handleClickSlot(idx)}
                        disabled={isDuplicateName && !isLoaded}
                        className={`px-4 py-2 rounded-md font-semibold text-sm transition-colors ${
                          isLoaded
                            ? 'bg-red-500/20 text-red-700 dark:text-red-300 hover:bg-red-500/30 border border-red-500/40'
                            : isDuplicateName
                              ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed opacity-60'
                              : 'bg-primary text-white hover:bg-blue-600'
                        }`}
                        title={isDuplicateName && !isLoaded ? 'Cannot load - duplicate name already loaded' : undefined}
                      >
                        {isLoaded ? 'Unload' : isDuplicateName ? 'Duplicate' : 'Load'}
                      </button>
                      {onOpenConfig && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // If not loaded, load it first then open config
                            if (!isLoaded && !isDuplicateName && onToggleLoad) {
                              onToggleLoad(slot, true);
                              // Small delay to allow state to update before opening config
                              setTimeout(() => {
                                onOpenConfig(slot.id);
                                onClose();
                              }, 100);
                            } else if (isLoaded) {
                              // Already loaded, just open config
                              onOpenConfig(slot.id);
                              onClose();
                            }
                          }}
                          disabled={isDuplicateName && !isLoaded}
                          className={`px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 ${
                            isDuplicateName && !isLoaded
                              ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed opacity-60'
                              : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border border-blue-500/30'
                          }`}
                          title={
                            isDuplicateName && !isLoaded 
                              ? 'Cannot configure - duplicate name already loaded'
                              : isLoaded
                                ? 'Configure this personality'
                                : 'Load and configure this personality'
                          }
                        >
                          <CogIcon className="w-4 h-4" />
                          Config
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Auto-proceed: Clear slot without confirmation
                          handleClearSlot(e, idx);
                        }}
                        className="px-4 py-2 rounded-md text-sm bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 border border-red-500/30 font-medium"
                        title="Clear this slot (requires confirmation)"
                      >
                        🗑️ Clear
                      </button>
                    </>
                  ) : importSaveCandidate ? (
                    <button
                      onClick={() => handleClickSlot(idx)}
                      className="px-4 py-2 rounded-md text-sm bg-primary text-white hover:bg-blue-600 font-semibold"
                    >
                      Save Here
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
            );
          })}
        </div>

        <div className="p-4 bg-light-bg dark:bg-base-900 border-t border-light-border dark:border-base-700 rounded-b-lg mt-auto">
          <div className="flex justify-center items-center gap-4">
            {effectiveMode === 'load' && onToggleLoad && (
              <>
                <button
                  onClick={() => {
                    // Load all non-empty, non-duplicate slots
                    let loadedCount = 0;
                    let skippedCount = 0;
                    slots.forEach(slot => {
                      if (slot) {
                        const isLoaded = loadedIds.includes(slot.id);
                        // Only flag as duplicate if there's a DIFFERENT personality with the same name
                        const isDuplicate = loadedPersonalities.some(
                          loaded => loaded.id !== slot.id && loaded.name.toLowerCase().trim() === slot.name.toLowerCase().trim()
                        );
                        
                        if (!isLoaded && !isDuplicate) {
                          onToggleLoad(slot, true);
                          loadedCount++;
                        } else {
                          skippedCount++;
                        }
                      }
                    });
                    
                    if (loadedCount === 0 && skippedCount === 0) {
                      console.log('No personalities in slots to load.');
                    } else if (loadedCount === 0) {
                      console.log(`All personalities in slots are already loaded or duplicates (${skippedCount} skipped).`);
                    } else {
                      console.log(`Loaded ${loadedCount} personalit${loadedCount !== 1 ? 'ies' : 'y'}${skippedCount > 0 ? ` (${skippedCount} skipped as already loaded/duplicates)` : ''}.`);
                    }
                  }}
                  className="px-4 py-2 rounded-md text-sm bg-green-600 text-white hover:bg-green-700 border border-green-500 font-semibold transition-colors"
                  title="Load all personalities from slots"
                >
                  ⚡ Load++
                </button>
                <button
                  onClick={() => {
                    // Unload all personalities that are in slots
                    let unloadedCount = 0;
                    slots.forEach(slot => {
                      if (slot && loadedIds.includes(slot.id)) {
                        onToggleLoad(slot, false);
                        unloadedCount++;
                      }
                    });
                    
                    if (unloadedCount === 0) {
                      console.log('No loaded personalities found in slots to eject.');
                    } else {
                      console.log(`Ejected ${unloadedCount} personalit${unloadedCount !== 1 ? 'ies' : 'y'}.`);
                    }
                  }}
                  className="px-4 py-2 rounded-md text-sm bg-orange-600 text-white hover:bg-orange-700 border border-orange-500 font-semibold transition-colors"
                  title="Unload all personalities that are in slots"
                >
                  ⏏️ Eject++
                </button>
                <button
                  onClick={handleStockMindsClick}
                  className="px-4 py-2 rounded-md text-sm bg-purple-600 text-white hover:bg-purple-700 border border-purple-500 font-semibold transition-colors"
                  title="Load stock personalities from the framework into available slots"
                >
                  🧠 Stock Minds
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
