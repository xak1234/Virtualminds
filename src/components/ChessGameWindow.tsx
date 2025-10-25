import React, { useState, useEffect, useRef } from 'react';
import type { Personality, ChatMessage } from '../types';
import { MessageAuthor } from '../types';
import { ChessBoard } from './ChessBoard';
import { chessService, type ChessGameState } from '../services/chessService';
import { CloseIcon } from './icons/CloseIcon';
import { MinimizeIcon } from './icons/MinimizeIcon';
import { CpuChipIcon } from './icons/CpuChipIcon';
import { PaperAirplaneIcon } from './icons/PaperAirplaneIcon';
import { UserAvatar } from './UserAvatar';

interface ChessGameWindowProps {
  personality: Personality;
  onClose: () => void;
  onSendToAI: (message: string) => void;
  chatHistory: ChatMessage[];
  onMove: (gameState: ChessGameState) => void;
  currentUser?: string | null;
}

export const ChessGameWindow: React.FC<ChessGameWindowProps> = ({
  personality,
  onClose,
  onSendToAI,
  chatHistory,
  onMove,
  currentUser,
}) => {
  const [gameState, setGameState] = useState<ChessGameState>({
    board: chessService.createInitialBoard(),
    currentTurn: 'white',
    moveHistory: [],
    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
  });
  const [playerColor] = useState<'white' | 'black'>('white');
  const [chatInput, setChatInput] = useState('');
  const [isWaitingForAI, setIsWaitingForAI] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastAIMoveRef = useRef<string>('');

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Check if AI should move (only when not minimized)
  useEffect(() => {
    if (!isMinimized && gameState.currentTurn !== playerColor && !gameState.isCheckmate && !gameState.isStalemate && !isWaitingForAI) {
      // Request AI move
      const boardState = chessService.boardToString(gameState.board);
      const moveHistoryStr = gameState.moveHistory.map(m => m.notation).join(', ');
      
      const prompt = `You are playing chess as ${gameState.currentTurn}. Current board position (in FEN-like notation): ${boardState}
Move history: ${moveHistoryStr || 'Game just started'}
${gameState.isCheck ? 'You are in CHECK!' : ''}

Make your next move in standard algebraic notation (e.g., e4, Nf3, Qxd5). Only respond with the move notation and optionally a brief comment about your strategy in character. Stay true to your personality while playing.`;

      setIsWaitingForAI(true);
      onSendToAI(prompt);
    }
  }, [gameState.currentTurn, playerColor, gameState.isCheckmate, gameState.isStalemate, isWaitingForAI, onSendToAI, isMinimized]);

  // Parse AI's response for chess moves
  useEffect(() => {
    if (chatHistory.length === 0) return;
    
    const lastMessage = chatHistory[chatHistory.length - 1];
    if (lastMessage.author === MessageAuthor.AI && isWaitingForAI) {
      try {
        // Extract chess notation from AI's response
        const movePattern = /\b([KQRBN]?[a-h]?[1-8]?x?[a-h][1-8]|O-O-O|O-O)\b/g;
        const matches = lastMessage.text.match(movePattern);
        
        if (matches && matches.length > 0) {
          const moveNotation = matches[0];
          
          // Avoid processing the same move twice
          if (moveNotation === lastAIMoveRef.current) return;
          lastAIMoveRef.current = moveNotation;
          
          const parsedMove = chessService.parseNotation(gameState.board, moveNotation, gameState.currentTurn);
          
          if (parsedMove) {
            const newGameState = chessService.makeMove(gameState, parsedMove.from, parsedMove.to);
            if (newGameState) {
              setGameState(newGameState);
              onMove(newGameState);
              setIsWaitingForAI(false);
            }
          }
        }
      } catch (error) {
        console.error('Error parsing AI chess move:', error);
      }
      
      setIsWaitingForAI(false);
    }
  }, [chatHistory, isWaitingForAI, gameState, onMove]);

  const handlePlayerMove = (from: { row: number; col: number }, to: { row: number; col: number }) => {
    try {
      const newGameState = chessService.makeMove(gameState, from, to);
      if (newGameState) {
        setGameState(newGameState);
        onMove(newGameState);
        
        // Announce the move to AI
        const move = newGameState.lastMove;
        if (move) {
          const announcement = `I played ${move.notation}${move.isCheck ? '+' : ''}${move.isCheckmate ? '#' : ''}`;
          onSendToAI(announcement);
        }
      }
    } catch (error) {
      console.error('Chess move error:', error);
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      onSendToAI(chatInput);
      setChatInput('');
    }
  };

  const getAvatar = () => {
    if (personality.profileImage) {
      return <img src={personality.profileImage} alt={personality.name} className="w-8 h-8 rounded-full object-cover" />;
    }
    return <CpuChipIcon className="w-8 h-8 text-accent" />;
  };

  // Safety check
  if (!personality) {
    return null;
  }

  // When minimized, show a compact bar
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-xl shadow-2xl border-2 border-cyan-500/30 p-4 min-w-[300px]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">♟️</span>
              <div>
                <h3 className="font-bold text-white text-sm">Chess Game</h3>
                <p className="text-xs text-gray-400">
                  vs {personality.name} • {gameState.moveHistory.length} moves
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsMinimized(false)}
                className="text-cyan-400 hover:text-cyan-300 transition-colors px-3 py-1 bg-cyan-900/30 rounded-lg text-sm font-semibold"
                title="Restore"
              >
                Restore
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
                title="Close"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
      <div className="w-full h-full max-w-[95vw] max-h-[90vh] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-2xl shadow-2xl overflow-hidden flex flex-col border-2 border-cyan-500/20" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b-2 border-cyan-500/30 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 backdrop-blur">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-2">
              ♟️ Chess Battle
            </h2>
            <p className="text-base text-gray-300 mt-1">
              <span className="text-cyan-400 font-semibold">You (White)</span> vs <span className="text-purple-400 font-semibold">{personality.name} (Black)</span>
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsMinimized(true)} 
              className="text-gray-400 hover:text-cyan-400 transition-all hover:scale-110"
              title="Minimize (Pause Game)"
            >
              <MinimizeIcon className="w-6 h-6" />
            </button>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-white transition-all hover:rotate-90 hover:scale-110"
              title="Close Game"
            >
              <CloseIcon className="w-7 h-7" />
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex gap-6 p-6 overflow-hidden">
          {/* Chess Board */}
          <div className="flex items-center justify-center">
            <ChessBoard
              board={gameState.board}
              onMove={handlePlayerMove}
              currentTurn={gameState.currentTurn}
              playerColor={playerColor}
              lastMove={gameState.lastMove}
              isGameOver={gameState.isCheckmate || gameState.isStalemate}
            />
          </div>

          {/* Chat & Game Info */}
          <div className="flex-1 flex flex-col min-w-0 max-w-md">
            {/* Game Status */}
            <div className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 rounded-2xl p-5 border-2 border-cyan-500/40 mb-4 shadow-xl">
              <h3 className="font-bold text-xl text-cyan-300 mb-3 flex items-center justify-center gap-2">
                <span className="text-2xl">📊</span> Game Status
              </h3>
              <div className="space-y-2 text-sm text-gray-100">
                <div className="flex items-center justify-between bg-slate-800/50 rounded-lg px-3 py-2">
                  <span className="text-gray-300">Current Turn:</span>
                  <span className="font-bold text-lg">
                    {gameState.currentTurn === 'white' ? '⚪ White' : '⚫ Black'}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-slate-800/50 rounded-lg px-3 py-2">
                  <span className="text-gray-300">Moves:</span>
                  <span className="font-bold text-cyan-400">{gameState.moveHistory.length}</span>
                </div>
                {gameState.isCheck && (
                  <div className="bg-red-900/40 border-2 border-red-500 rounded-lg px-3 py-2 text-center">
                    <p className="text-red-300 font-bold text-lg animate-pulse">⚠️ CHECK!</p>
                  </div>
                )}
                {gameState.isCheckmate && (
                  <div className="bg-red-900/60 border-2 border-red-400 rounded-lg px-3 py-2 text-center">
                    <p className="text-red-200 font-bold text-xl animate-pulse">👑 CHECKMATE!</p>
                  </div>
                )}
                {gameState.isStalemate && (
                  <div className="bg-yellow-900/40 border-2 border-yellow-500 rounded-lg px-3 py-2 text-center">
                    <p className="text-yellow-300 font-bold text-lg">🤝 STALEMATE!</p>
                  </div>
                )}
              </div>
              
              {/* Move History */}
              {gameState.moveHistory.length > 0 && (
                <div className="mt-4 bg-slate-800/40 rounded-lg p-3">
                  <h4 className="font-semibold text-cyan-400 text-xs mb-2 flex items-center gap-1">
                    <span>📝</span> Recent Moves
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {gameState.moveHistory.slice(-8).map((move, idx) => (
                      <span 
                        key={idx} 
                        className="bg-slate-700 text-cyan-300 px-2 py-1 rounded text-xs font-mono font-semibold"
                      >
                        {move.notation}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Chat Area */}
            <div className="flex-1 bg-gradient-to-br from-purple-900/50 to-slate-900/50 rounded-2xl border-2 border-purple-500/40 flex flex-col overflow-hidden shadow-xl">
              <div className="px-4 py-3 border-b-2 border-purple-500/30 bg-gradient-to-r from-purple-900/40 to-pink-900/40">
                <h3 className="font-bold text-lg text-purple-300 flex items-center gap-2">
                  <span className="text-xl">💬</span> Live Chat
                </h3>
                <p className="text-xs text-purple-400/80 mt-0.5">Talk strategy with {personality.name}</p>
              </div>
              
              <div className="flex-1 overflow-auto p-4 space-y-4 custom-scrollbar">
                {chatHistory.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 ${
                      msg.author === MessageAuthor.USER ? 'flex-row-reverse' : ''
                    } animate-fade-in`}
                  >
                    {msg.author === MessageAuthor.USER ? (
                      <UserAvatar 
                        username={currentUser} 
                        size="sm" 
                        showRing={true}
                        ringColor="ring-blue-500/50"
                        className="shadow-md"
                      />
                    ) : msg.author === MessageAuthor.AI ? (
                      <div className="flex-shrink-0 ring-2 ring-purple-500/30 rounded-full shadow-md">{getAvatar()}</div>
                    ) : null}
                    
                    {msg.author !== MessageAuthor.SYSTEM ? (
                      <div className="flex flex-col gap-1 max-w-[70%]">
                        <div
                          className={`px-4 py-2.5 rounded-2xl shadow-md ${
                            msg.author === MessageAuthor.USER
                              ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-tr-none'
                              : 'bg-slate-800/90 text-gray-100 border border-purple-500/30 rounded-tl-none'
                          }`}
                        >
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full text-center">
                        <span className="text-xs bg-yellow-900/40 text-yellow-200 border border-yellow-600/50 px-3 py-1 rounded-full">
                          {msg.text}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
                {isWaitingForAI && (
                  <div className="flex items-start gap-3 animate-fade-in">
                    <div className="flex-shrink-0 ring-2 ring-purple-500/30 rounded-full shadow-md">{getAvatar()}</div>
                    <div className="flex flex-col gap-1 max-w-[70%]">
                      <div className="bg-slate-800/90 text-gray-100 rounded-2xl rounded-tl-none px-4 py-2.5 border border-purple-500/30 shadow-md">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          </div>
                          <span className="text-sm">Analyzing position...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendChat} className="p-4 border-t-2 border-purple-500/30 bg-gradient-to-r from-purple-900/40 to-pink-900/40">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    placeholder="Say something to your opponent..."
                    className="flex-1 bg-slate-800 border-2 border-slate-600 rounded-xl px-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-inner"
                  />
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    <PaperAirplaneIcon className="w-5 h-5" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

