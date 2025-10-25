import React, { useState, useRef } from 'react';
import type { Personality, ModelConfig } from '../types';
import { DEFAULT_CONFIG } from '../constants';
import { UserIcon } from './icons/UserIcon';

declare const JSZip: any;

interface PersonalityDetailsModalProps {
  personality: Personality | null;
  onClose: () => void;
  onUpdatePersonality: (id: string, updates: Partial<Personality>) => void;
}

const DetailSection: React.FC<{ title: string; children: React.ReactNode; isCode?: boolean }> = ({ title, children, isCode = false }) => (
    <div>
        <h4 className="text-lg font-semibold text-light-text dark:text-gray-200 mb-2">{title}</h4>
        <div className={`w-full max-h-64 overflow-y-auto bg-light-bg dark:bg-base-900 border border-light-border dark:border-base-600 rounded-md p-3 text-sm whitespace-pre-wrap ${isCode ? 'font-mono' : ''}`}>
            {children}
        </div>
    </div>
);

const ConfigSlider: React.FC<{label: string, value: number, onChange: (value: number) => void, min: number, max: number, step: number}> = 
  ({label, value, onChange, min, max, step}) => (
  <div>
    <label className="block text-sm font-medium text-light-text-secondary dark:text-gray-400 mb-2">
      {label} <span className="font-mono text-accent">{typeof value === 'number' ? value.toFixed(2) : 'N/A'}</span>
    </label>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-2 bg-light-border dark:bg-base-700 rounded-lg appearance-none cursor-pointer"
    />
  </div>
);

const processImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('File is not an image.'));
    }
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 128;
            const MAX_HEIGHT = 128;
            let { width, height } = img;
            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Could not get canvas context'));
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = event.target?.result as string;
    };
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
};

const dataURLtoBlob = (dataURL: string): Blob => {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};


export const PersonalityDetailsModal: React.FC<PersonalityDetailsModalProps> = ({ personality, onClose, onUpdatePersonality }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'prompt' | 'knowledge' | 'config' | 'tts'>('profile');
  const [error, setError] = useState<string | null>(null);
  const profileImageInputRef = useRef<HTMLInputElement>(null);

  if (!personality) return null;

  // Handle keyboard events - prevent closing modal when editing text
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Check if user is editing in an input or textarea
    const target = e.target as HTMLElement;
    const isEditingText = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
    
    // If editing text, don't close modal on Escape
    if (e.key === 'Escape' && isEditingText) {
      e.stopPropagation();
      // Blur the input to exit editing mode instead
      target.blur();
      return;
    }
    
    // If not editing, allow Escape to close
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const currentConfig = { ...DEFAULT_CONFIG, ...personality.config };

  const handleConfigChange = (key: keyof ModelConfig, value: number | string) => {
    onUpdatePersonality(personality.id, {
      config: { ...personality.config, [key]: value },
    });
  };

  const handleTtsToggle = (enabled: boolean) => {
    onUpdatePersonality(personality.id, { ttsEnabled: enabled });
  };
  
  const handleProfileImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        setError(null);
        try {
            const imageDataUrl = await processImage(e.target.files[0]);
            onUpdatePersonality(personality.id, { profileImage: imageDataUrl });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to process image.');
        } finally {
            e.target.value = '';
        }
    }
  };

  const handleExport = () => {
    if (!personality) return;
    
    const zip = new JSZip();
    zip.file("knowledge.txt", personality.knowledge);
    zip.file("prompt.txt", personality.prompt);
    
    // Include all config settings including ttsEnabled
    const configWithTts = { ...personality.config, ttsEnabled: personality.ttsEnabled };
    zip.file("config.json", JSON.stringify(configWithTts, null, 2));
    
    // Include profile image if it exists
    if (personality.profileImage) {
        zip.file("profile.png", dataURLtoBlob(personality.profileImage));
    }
    
    zip.generateAsync({ type: "blob" }).then(function(content: any) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `${personality.name.replace(/\s+/g, '_')}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
  };


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
        className="bg-light-panel dark:bg-base-800 rounded-lg shadow-xl w-full max-w-3xl border border-light-border dark:border-base-700 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="p-6 border-b border-light-border dark:border-base-700">
          <h2 className="text-2xl font-bold text-light-text dark:text-gray-100 text-center">{personality.name} - Details</h2>
        </div>

        <div className="border-b border-light-border dark:border-base-700 px-6">
            <nav className="-mb-px flex space-x-6">
                <button onClick={() => setActiveTab('profile')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'profile' ? 'border-primary text-primary' : 'border-transparent text-light-text-secondary dark:text-gray-400 hover:text-light-text dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-500'}`}>
                    Profile
                </button>
                <button onClick={() => setActiveTab('prompt')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'prompt' ? 'border-primary text-primary' : 'border-transparent text-light-text-secondary dark:text-gray-400 hover:text-light-text dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-500'}`}>
                    Prompt
                </button>
                 <button onClick={() => setActiveTab('knowledge')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'knowledge' ? 'border-primary text-primary' : 'border-transparent text-light-text-secondary dark:text-gray-400 hover:text-light-text dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-500'}`}>
                    Knowledge
                </button>
                 <button onClick={() => setActiveTab('config')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'config' ? 'border-primary text-primary' : 'border-transparent text-light-text-secondary dark:text-gray-400 hover:text-light-text dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-500'}`}>
                 Config
                </button>
                <button onClick={() => setActiveTab('tts')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'tts' ? 'border-primary text-primary' : 'border-transparent text-light-text-secondary dark:text-gray-400 hover:text-light-text dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-500'}`}>
                    TTS Settings
                </button>
            </nav>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
           {error && <div className="bg-red-900 border border-red-700 text-red-200 p-3 rounded-md mb-4">{error}</div>}
           {activeTab === 'profile' && (
                <div>
                    <h4 className="text-lg font-semibold text-light-text dark:text-gray-200 mb-2">Profile Image</h4>
                    <div className="flex items-center gap-4">
                        <div className="w-32 h-32 rounded-full bg-light-bg dark:bg-base-900 border-2 border-dashed border-light-border dark:border-base-600 flex items-center justify-center text-light-text-secondary dark:text-gray-500 overflow-hidden">
                            {personality.profileImage ? <img src={personality.profileImage} alt="Profile Preview" className="w-full h-full object-cover"/> : <UserIcon className="w-16 h-16" />}
                        </div>
                        <div>
                            <input type="file" ref={profileImageInputRef} onChange={handleProfileImageSelect} accept="image/*" className="hidden" />
                            <button onClick={() => profileImageInputRef.current?.click()} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-600 transition-colors">
                                Upload Image
                            </button>
                            <p className="text-xs text-light-text-secondary dark:text-gray-500 mt-2">Recommended: Square image (e.g., 256x256px)</p>
                        </div>
                    </div>
                </div>
           )}

           {activeTab === 'prompt' && <DetailSection title="System Prompt" isCode>{personality.prompt}</DetailSection>}
           {activeTab === 'knowledge' && <DetailSection title="Knowledge Base">{personality.knowledge}</DetailSection>}
           {activeTab === 'config' && (
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-light-text dark:text-gray-200 mb-2">AI Settings</h4>
                  <div className="w-full bg-light-bg dark:bg-base-900 border border-light-border dark:border-base-600 rounded-md p-4 space-y-4">
                     <p className="text-xs text-light-text-secondary dark:text-gray-400">Controls randomness. Higher values (e.g., 1.2) make responses more creative and varied; lower values (e.g., 0.2) make them more focused and deterministic.</p>
                     <ConfigSlider label="Temperature" value={currentConfig.temperature} onChange={(v) => handleConfigChange('temperature', v)} min={0} max={2} step={0.01} />

                     <p className="text-xs text-light-text-secondary dark:text-gray-400">Nucleus sampling. The model selects from the smallest set of tokens whose cumulative probability ≥ Top‑P. Lower values limit choices; higher values increase diversity.</p>
                     <ConfigSlider label="Top-P" value={currentConfig.topP} onChange={(v) => handleConfigChange('topP', v)} min={0} max={1} step={0.01} />

                     <p className="text-xs text-light-text-secondary dark:text-gray-400">Top‑K sampling. Limits the model to the K most likely tokens each step. Lower values are safer; higher values can be more expressive (if supported by the model).</p>
                     <ConfigSlider label="Top-K" value={currentConfig.topK} onChange={(v) => handleConfigChange('topK', v)} min={1} max={100} step={1} />

                     <p className="text-xs text-light-text-secondary dark:text-gray-400">Maximum number of tokens in the AI's response. Higher values allow longer replies but can be slower and cost more for cloud models.</p>
                     <ConfigSlider label="Max Tokens" value={currentConfig.maxOutputTokens} onChange={(v) => handleConfigChange('maxOutputTokens', v)} min={1} max={8192} step={1} />

                  </div>
                </div>
            )}

           {activeTab === 'tts' && (
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-light-text dark:text-gray-200 mb-2">Text-to-Speech Settings</h4>
                  <div className="w-full bg-light-bg dark:bg-base-900 border border-light-border dark:border-base-600 rounded-md p-4 space-y-4">
                    <div>
                        <label htmlFor="voice-id-details" className="block text-sm font-medium text-light-text-secondary dark:text-gray-400 mb-2">Voice ID / Name (for TTS)</label>
                        <input
                          id="voice-id-details"
                          type="text"
                          value={currentConfig.voiceId || ''}
                          onChange={e => handleConfigChange('voiceId', e.target.value)}
                          onKeyDown={e => e.stopPropagation()}
                          placeholder="e.g., o7lPjDgzS2Fj5yAmH2oR or nova"
                          className="w-full bg-light-bg dark:bg-base-700 border border-light-border dark:border-base-600 rounded-md px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <p className="text-xs text-light-text-secondary dark:text-gray-500 mt-2">Primary voice used for the selected TTS provider.</p>
                    </div>

                    <div>
                        <label htmlFor="additional-voices" className="block text-sm font-medium text-light-text-secondary dark:text-gray-400 mb-2">Additional Voice IDs (one per line)</label>
                        <textarea
                          id="additional-voices"
                          value={(personality.config.additionalVoiceIds || []).join('\n')}
                          onChange={(e) => {
                            const lines = e.target.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
                            onUpdatePersonality(personality.id, {
                              config: { ...personality.config, additionalVoiceIds: lines }
                            });
                          }}
                          onKeyDown={e => e.stopPropagation()}
                          placeholder="e.g.\n- en-GB-Wavenet-A (Gemini TTS)\n- alloy (OpenAI TTS)\n- 9031f2a1-... (ElevenLabs Voice ID)"
                          className="w-full bg-light-bg dark:bg-base-700 border border-light-border dark:border-base-600 rounded-md px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]"
                        />
                        <p className="text-xs text-light-text-secondary dark:text-gray-500 mt-1">Use this to store alternative voices per provider. The app can use these when switching providers.</p>
                    </div>

                    <ConfigSlider label="TTS Speed" value={currentConfig.ttsRate} onChange={(v) => handleConfigChange('ttsRate', v)} min={0.5} max={2.0} step={0.05} />

                    {/* Google TTS (Gemini) Options */}
                    <div className="pt-2 border-t border-light-border dark:border-base-700 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="google-voice-name" className="block text-sm font-medium text-light-text-secondary dark:text-gray-400 mb-2">Google Voice Name</label>
                          <input
                            id="google-voice-name"
                            type="text"
                            value={personality.config.googleTtsOptions?.voiceName || ''}
                            onChange={(e) => onUpdatePersonality(personality.id, {
                              config: { ...personality.config, googleTtsOptions: { ...(personality.config.googleTtsOptions || {}), voiceName: e.target.value } }
                            })}
                            onKeyDown={e => e.stopPropagation()}
                            placeholder="e.g., en-GB-Wavenet-A"
                            className="w-full bg-light-bg dark:bg-base-700 border border-light-border dark:border-base-600 rounded-md px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-light-text-secondary dark:text-gray-400 mb-2">Speaking Rate</label>
                          <input
                            type="range"
                            min={0.25}
                            max={2.0}
                            step={0.01}
                            value={personality.config.googleTtsOptions?.speakingRate ?? 1.0}
                            onChange={(e) => onUpdatePersonality(personality.id, {
                              config: { ...personality.config, googleTtsOptions: { ...(personality.config.googleTtsOptions || {}), speakingRate: parseFloat(e.target.value) } }
                            })}
                            className="w-full h-2 bg-light-border dark:bg-base-700 rounded-lg appearance-none cursor-pointer"
                          />
                          <p className="text-xs text-light-text-secondary dark:text-gray-500">{(personality.config.googleTtsOptions?.speakingRate ?? 1.0).toFixed(2)}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-light-text-secondary dark:text-gray-400 mb-2">Pitch</label>
                          <input
                            type="range"
                            min={-10}
                            max={10}
                            step={0.1}
                            value={personality.config.googleTtsOptions?.pitch ?? 0}
                            onChange={(e) => onUpdatePersonality(personality.id, {
                              config: { ...personality.config, googleTtsOptions: { ...(personality.config.googleTtsOptions || {}), pitch: parseFloat(e.target.value) } }
                            })}
                            className="w-full h-2 bg-light-border dark:bg-base-700 rounded-lg appearance-none cursor-pointer"
                          />
                          <p className="text-xs text-light-text-secondary dark:text-gray-500">{(personality.config.googleTtsOptions?.pitch ?? 0).toFixed(1)}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-light-text-secondary dark:text-gray-400 mb-2">Volume Gain (dB)</label>
                          <input
                            type="range"
                            min={-12}
                            max={12}
                            step={0.5}
                            value={personality.config.googleTtsOptions?.volumeGainDb ?? 0}
                            onChange={(e) => onUpdatePersonality(personality.id, {
                              config: { ...personality.config, googleTtsOptions: { ...(personality.config.googleTtsOptions || {}), volumeGainDb: parseFloat(e.target.value) } }
                            })}
                            className="w-full h-2 bg-light-border dark:bg-base-700 rounded-lg appearance-none cursor-pointer"
                          />
                          <p className="text-xs text-light-text-secondary dark:text-gray-500">{(personality.config.googleTtsOptions?.volumeGainDb ?? 0).toFixed(1)} dB</p>
                        </div>
                        <div className="md:col-span-2">
                          <label htmlFor="effects-profiles" className="block text-sm font-medium text-light-text-secondary dark:text-gray-400 mb-2">Effects Profiles (comma-separated)</label>
                          <input
                            id="effects-profiles"
                            type="text"
                            value={(personality.config.googleTtsOptions?.effectsProfileId || []).join(', ')}
                            onChange={(e) => {
                              const list = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                              onUpdatePersonality(personality.id, {
                                config: { ...personality.config, googleTtsOptions: { ...(personality.config.googleTtsOptions || {}), effectsProfileId: list } }
                              });
                            }}
                            onKeyDown={e => e.stopPropagation()}
                            placeholder="e.g., small-bluetooth-speaker-class-device"
                            className="w-full bg-light-bg dark:bg-base-700 border border-light-border dark:border-base-600 rounded-md px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                    </div>

                    <label className="flex items-center pt-4 border-t border-light-border dark:border-base-700 cursor-pointer">
                         <input
                           type="checkbox"
                           checked={!!personality.ttsEnabled}
                           onChange={e => handleTtsToggle(e.target.checked)}
                           className="h-4 w-4 rounded border-gray-300 text-primary bg-base-900 focus:ring-primary"
                         />
                         <span className="ml-3 text-sm font-medium text-light-text-secondary dark:text-gray-400">Enable Text-to-Speech by default</span>
                    </label>
                  </div>
                </div>
            )}
        </div>

        <div className="p-4 bg-light-bg dark:bg-base-900 border-t border-light-border dark:border-base-700 flex justify-between items-center rounded-b-lg mt-auto">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Export
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
