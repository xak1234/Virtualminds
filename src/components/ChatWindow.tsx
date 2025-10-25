
import React from 'react';
import { useEffect, useRef } from 'react';
import type { ChatMessage, Personality } from '../types';
import { MessageAuthor } from '../types';
import { UserAvatar } from './UserAvatar';
import { CpuChipIcon } from './icons/CpuChipIcon';
import { PaperAirplaneIcon } from './icons/PaperAirplaneIcon';
import { SpeakerOnIcon } from './icons/SpeakerOnIcon';
import { SpeakerOffIcon } from './icons/SpeakerOffIcon';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import { MicrophoneOffIcon } from './icons/MicrophoneOffIcon';
import { RepeatIcon } from './icons/RepeatIcon';
import * as ttsService from '../services/ttsService';


interface ChatWindowProps {
  personality: Personality;
  chatHistory: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  onRepeatAt?: (index: number) => void;
  currentUser: string | null;
  sessionTtsEnabled: boolean;
  onTtsToggle: () => void;
  isConversing: boolean;
  isDragging?: boolean;
  isCurrentSpeaker?: boolean;
  inputTextColor?: string;
  aiTextColor?: string;
  chatMessageAlpha?: number;
  onSkipToNext?: () => void; // optional callback to skip to next person in conversation
  isPersonalityKilled?: boolean;
}

// FIX: Relaxed the personality prop to only require properties used by the component.
// This resolves a type error when rendering avatars for secondary AI participants in a conversation.
const AiAvatar: React.FC<{ personality: { name?: string; profileImage?: string; }; className?: string }> = ({ personality, className }) => {
    const baseClass = "w-8 h-8 flex-shrink-0 rounded-full";
    if (personality.profileImage) {
        return <img src={personality.profileImage} alt={personality.name || 'AI Avatar'} className={`${baseClass} object-cover ${className}`} />;
    }
    return <CpuChipIcon className={`${baseClass} text-accent bg-light-panel dark:bg-base-700 p-1 ${className}`} />;
};


const ChatBubble: React.FC<{ message: ChatMessage; personality: Personality; onRepeat?: () => void; aiTextColor?: string; inputTextColor?: string; chatMessageAlpha?: number; currentUser?: string | null; }> = ({ message, personality, onRepeat, aiTextColor, inputTextColor, chatMessageAlpha, currentUser }) => {
  if (message.author === MessageAuthor.SYSTEM) {
    return (
      <div className="text-center my-2">
        <span 
          className="text-xs text-light-text-secondary dark:text-gray-500 px-3 py-1 rounded-full whitespace-pre-wrap"
          style={{
            backgroundColor: `rgba(243, 244, 246, ${chatMessageAlpha || 1.0})`, // light mode: bg-light-panel with alpha
            ...(document.documentElement.classList.contains('dark') ? {
              backgroundColor: `rgba(55, 65, 81, ${chatMessageAlpha || 1.0})` // dark mode: bg-base-700 with alpha
            } : {})
          }}
        >
          {message.text}
        </span>
      </div>
    );
  }

  const isUser = message.author === MessageAuthor.USER;

  const formatTimestamp = (timestamp: string): string => {
    if (!timestamp || timestamp === new Date(0).toISOString()) return '';
    const date = new Date(timestamp);
    const today = new Date();
    const isToday = date.getFullYear() === today.getFullYear() &&
                  date.getMonth() === today.getMonth() &&
                  date.getDate() === today.getDate();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleString([], { year: '2-digit', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  
  const authorPersonality = message.authorName === personality.name ? personality : { profileImage: undefined, name: message.authorName };


  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Show appropriate avatar */}
      {isUser ? (
        <UserAvatar 
          username={currentUser} 
          size="md" 
          showRing={true}
          ringColor="ring-blue-500/50"
          className="shadow-lg"
        />
      ) : (
        <AiAvatar personality={authorPersonality} className="shadow-lg ring-2 ring-purple-500/30" />
      )}
      
      <div className="flex flex-col gap-1 max-w-[70%]">
        <div
          className={`px-4 py-3 rounded-2xl shadow-md user-select-text transition-all duration-200 hover:shadow-lg ${
            isUser
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-tr-none'
              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none'
          }`}
          style={{
            ...(chatMessageAlpha && chatMessageAlpha < 1 ? {
              opacity: chatMessageAlpha
            } : {})
          }}
        >
        {/* Remove the "You" label as the avatar makes it clear */}
        
        {!isUser && (
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="whitespace-pre-wrap select-text text-sm leading-relaxed" style={aiTextColor ? { color: aiTextColor } : undefined}>{message.text}</p>
            </div>
            {/* Repeat button for AI responses */}
            {onRepeat && (
              <button
                onClick={onRepeat}
                title="Repeat this response"
                className="flex-shrink-0 p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
              >
                <RepeatIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
        
        {isUser && (
          <p className="whitespace-pre-wrap select-text text-sm leading-relaxed" style={inputTextColor ? { color: inputTextColor } : undefined}>{message.text}</p>
        )}
        </div>
        
        {/* Timestamp and author name outside the bubble */}
        <div className={`flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 ${isUser ? 'justify-end' : ''}`}>
          {!isUser && message.authorName && (
            <span className="font-medium">{message.authorName}</span>
          )}
          {message.timestamp && (
            <span className="opacity-70">{formatTimestamp(message.timestamp)}</span>
          )}
        </div>
      </div>
    </div>
  );
};


export const ChatWindow: React.FC<ChatWindowProps> = ({
  personality,
  chatHistory,
  isLoading,
  onSendMessage,
  currentUser,
  sessionTtsEnabled,
  onTtsToggle,
  isConversing,
  isDragging = false,
  isCurrentSpeaker = false,
  inputTextColor,
  aiTextColor,
  chatMessageAlpha,
  onSkipToNext,
  onRepeatAt,
  isPersonalityKilled = false,
}) => {
  const [input, setInput] = React.useState('');
  const [isListening, setIsListening] = React.useState(false);
  const [interim, setInterim] = React.useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Speech recognition setup
  const recognitionRef = useRef<any | null>(null);
  const bufferRef = useRef<string>('');
  const inactivityTimerRef = useRef<number | null>(null);

  const getSpeechRecognition = () => {
    const w: any = window as any;
    return w.SpeechRecognition || w.webkitSpeechRecognition || null;
  };

  const clearInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      window.clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  };

  const flushAndSend = () => {
    clearInactivityTimer();
    const text = bufferRef.current.trim() || interim.trim();
    bufferRef.current = '';
    setInterim('');
    if (text.length > 0) {
      onSendMessage(text);
    }
  };

  const scheduleFlush = () => {
    clearInactivityTimer();
    inactivityTimerRef.current = window.setTimeout(() => {
      flushAndSend();
    }, 1000); // send after ~1s of silence
  };

  const startListening = () => {
    if (isLoading || isConversing) return;
    const SR = getSpeechRecognition();
    if (!SR) {
      console.warn('Speech recognition is not supported in this browser. Try Chrome.');
      return;
    }
    try {
      // Stop TTS to avoid echo while recording
      ttsService.cancel();
    } catch {}

    const rec = new SR();
    recognitionRef.current = rec;
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (event: any) => {
      let latestInterim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          bufferRef.current += (bufferRef.current ? ' ' : '') + res[0].transcript;
        } else {
          latestInterim += res[0].transcript;
        }
      }
      setInterim(latestInterim);
      scheduleFlush();
    };

    rec.onerror = (_e: any) => {
      // Stop on error
      stopListening(true);
    };

    rec.onend = () => {
      // If still in listening mode, either flush buffered text or restart
      if (!isListening) return;
      if ((bufferRef.current.trim() || interim.trim()).length > 0) {
        flushAndSend();
      }
      // Auto-restart to keep session until user toggles off
      try {
        rec.start();
      } catch {
        // ignore
      }
    };

    try {
      rec.start();
      setIsListening(true);
    } catch (e) {
      console.warn('Failed to start speech recognition:', e);
      recognitionRef.current = null;
      setIsListening(false);
    }
  };

  const stopListening = (fromError = false) => {
    clearInactivityTimer();
    setInterim('');
    const rec = recognitionRef.current;
    if (rec) {
      try { rec.onresult = null; rec.onend = null; rec.onerror = null; } catch {}
      try { rec.stop(); } catch {}
    }
    recognitionRef.current = null;
    setIsListening(false);
    if (!fromError) {
      // On manual toggle off, send any buffered speech
      if (bufferRef.current.trim().length > 0) flushAndSend();
    }
  };

  const scrollToBottom = () => {
    if (!isDragging) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Auto-mute microphone while TTS is speaking to prevent feedback loops
  const wasListeningBeforeTtsRef = useRef(false);
  useEffect(() => {
    const interval = window.setInterval(() => {
      const speaking = ttsService.isCurrentlySpeaking();
      if (speaking && isListening) {
        wasListeningBeforeTtsRef.current = true;
        // Stop listening without flushing buffered text
        stopListening(true);
      }
    }, 150);
    return () => window.clearInterval(interval);
  }, [isListening]);

  useEffect(() => {
    if (!isDragging) {
      scrollToBottom();
    }
  }, [chatHistory, isLoading, isDragging]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPersonalityKilled) {
      return;
    }
    if (!isLoading && !isConversing) {
      const text = `${input} ${interim}`.trim();
      if (text) {
        onSendMessage(text);
        setInput('');
        setInterim('');
        bufferRef.current = '';
        clearInactivityTimer();
        if (isListening) {
          // keep listening session active but clear buffer for next utterance
        }
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full">
        <>
          {/* Header is now handled by DraggableWindow */}
          <div 
            className={`flex-1 p-6 space-y-6 ${
              isDragging 
                ? 'overflow-hidden pointer-events-none select-none' 
                : 'overflow-y-auto'
            } ${isConversing && onSkipToNext ? 'cursor-pointer' : ''}`} 
            data-scrollable
            onClick={(e) => {
              // Only trigger skip if clicking directly on the messages area, not on input fields or buttons
              const target = e.target as HTMLElement;
              if (isConversing && onSkipToNext && !target.closest('input, textarea, button')) {
                onSkipToNext();
              }
            }}
            title={isConversing ? "Click to skip to next person" : undefined}
          >
            {!currentUser && chatHistory.length === 0 && (
                 <div className="text-center my-2">
                    <span 
                      className="text-xs text-light-text-secondary dark:text-gray-500 px-3 py-1 rounded-full whitespace-pre-wrap"
                      style={{
                        backgroundColor: `rgba(243, 244, 246, ${chatMessageAlpha || 1.0})`, // light mode: bg-light-panel with alpha
                        ...(document.documentElement.classList.contains('dark') ? {
                          backgroundColor: `rgba(55, 65, 81, ${chatMessageAlpha || 1.0})` // dark mode: bg-base-700 with alpha
                        } : {})
                      }}
                    >
                        You are chatting as a guest. History will not be saved.<br/>Use 'register' or 'login' in the CLI to save conversations.
                    </span>
                </div>
            )}
            {chatHistory.map((msg, index) => (
              <ChatBubble
                key={index}
                message={msg}
                personality={personality}
                onRepeat={msg.author === MessageAuthor.AI ? (() => onRepeatAt && onRepeatAt(index)) : undefined}
                aiTextColor={aiTextColor}
                inputTextColor={inputTextColor}
                chatMessageAlpha={chatMessageAlpha}
                currentUser={currentUser}
              />
            ))}
            {isLoading && (
               <div className="flex items-start gap-3">
                  <AiAvatar personality={personality} className="shadow-lg ring-2 ring-purple-500/30" />
                  <div className="flex flex-col gap-1 max-w-[70%]">
                    <div 
                      className="px-4 py-3 rounded-2xl shadow-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-tl-none"
                      style={{
                        ...(chatMessageAlpha && chatMessageAlpha < 1 ? {
                          opacity: chatMessageAlpha
                        } : {})
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-4 border-t border-light-border dark:border-base-700">
            {isPersonalityKilled && (
              <div className="mb-3 text-center text-xs font-mono uppercase tracking-[0.3em] text-red-600 dark:text-red-400 flex items-center justify-center gap-2">
                <span className="text-sm">💀</span>
                <span>No responses - personality deceased</span>
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex items-center gap-4">
              <input
                type="text"
                value={interim ? `${input}${input ? ' ' : ''}${interim}` : input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  // Stop propagation of keyboard events to prevent them from bubbling up
                  // and potentially triggering unintended window behaviors
                  e.stopPropagation();
                }}
                placeholder="> /clear to clear the window"
                className="flex-1 bg-light-panel/80 dark:bg-base-800/80 backdrop-blur-sm border border-light-border dark:border-base-600 rounded-md px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 placeholder:text-green-400 placeholder:text-opacity-70"
                disabled={isLoading || isConversing || isPersonalityKilled}
                style={inputTextColor ? { color: inputTextColor } : undefined}
              />
              <button
                type="button"
                onClick={() => {
                  if (isListening) { stopListening(false); } else { startListening(); }
                }}
                className={`p-2 rounded-md transition-colors duration-200 ${
                  isListening ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-black/10 dark:bg-base-700 text-light-text dark:text-gray-300 hover:bg-black/20 dark:hover:bg-base-600'
                }`}
                title={isListening ? 'Stop voice input' : 'Start voice input'}
                disabled={isLoading || isConversing || isPersonalityKilled || !getSpeechRecognition()}
              >
                {isListening ? (
                  <MicrophoneOffIcon className="w-6 h-6" />
                ) : (
                  <MicrophoneIcon className="w-6 h-6" />
                )}
              </button>
              <button
                type="submit"
                className="bg-primary text-white p-2 rounded-md hover:bg-blue-600 disabled:bg-base-600 disabled:cursor-not-allowed transition-colors duration-200"
                disabled={isLoading || (!input.trim() && !interim.trim()) || isConversing || isPersonalityKilled}
              >
                <PaperAirplaneIcon className="w-6 h-6" />
              </button>
            </form>
          </div>
        </>
    </div>
  );
};
