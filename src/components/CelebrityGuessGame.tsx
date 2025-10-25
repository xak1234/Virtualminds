import React, { useState, useEffect } from 'react';
import type { Personality } from '../types';
import {
  celebrityGuessService,
  type CelebrityGuessGameState,
} from '../services/celebrityGuessService';
import { CloseIcon } from './icons/CloseIcon';
import { CpuChipIcon } from './icons/CpuChipIcon';

interface CelebrityGuessGameProps {
  personalities: Personality[];
  gameState: CelebrityGuessGameState;
  onClose: () => void;
  onAskQuestion: (pretenderId: string, askerId: string, question: string) => void;
  onMakeGuess: (guesserId: string, guess: string) => void;
  onRequestCelebrity: (pretenderId: string) => void;
  onCompleteRound: () => void;
  onEndGame: () => void;
  onManualStartRound: (celebrity: string) => void;
}

export const CelebrityGuessGame: React.FC<CelebrityGuessGameProps> = ({
  personalities,
  gameState,
  onClose,
  onAskQuestion,
  onMakeGuess,
  onRequestCelebrity,
  onCompleteRound,
  onEndGame,
  onManualStartRound,
}) => {
  const [questionInput, setQuestionInput] = useState('');
  const [guessInput, setGuessInput] = useState('');
  const [selectedAskerId, setSelectedAskerId] = useState<string>('');
  const [selectedGuesserId, setSelectedGuesserId] = useState<string>('');
  const [isRequestingCelebrity, setIsRequestingCelebrity] = useState(false);

  // Start first round automatically
  useEffect(() => {
    if (gameState.isActive && !gameState.currentRound && !isRequestingCelebrity) {
      // Request celebrity from AI
      setIsRequestingCelebrity(true);
      const pretender = gameState.participants[gameState.currentPretenderIndex];
      onRequestCelebrity(pretender.id);
    }
  }, [gameState.isActive, gameState.currentRound, gameState.currentPretenderIndex, isRequestingCelebrity, onRequestCelebrity, gameState.participants]);

  // Reset requesting flag when round starts
  useEffect(() => {
    if (gameState.currentRound) {
      setIsRequestingCelebrity(false);
    }
  }, [gameState.currentRound]);

  const handleAskQuestion = () => {
    if (!selectedAskerId || !questionInput.trim() || !gameState.currentRound) return;

    onAskQuestion(gameState.currentRound.pretenderId, selectedAskerId, questionInput);
    setQuestionInput('');
  };

  const handleMakeGuess = () => {
    if (!selectedGuesserId || !guessInput.trim()) return;

    onMakeGuess(selectedGuesserId, guessInput);
    setGuessInput('');
  };

  const handleNextRound = () => {
    setIsRequestingCelebrity(false);
    onCompleteRound();
  };

  const handleEndGame = () => {
    onEndGame();
  };

  const getParticipantAvatar = (personality: Personality) => {
    if (personality.profileImage) {
      return (
        <img
          src={personality.profileImage}
          alt={personality.name}
          className="w-10 h-10 rounded-full object-cover"
        />
      );
    }
    return <CpuChipIcon className="w-10 h-10 text-cyan-400" />;
  };

  const getGuessers = () => {
    if (!gameState.currentRound) return [];
    return gameState.participants.filter(p => p.id !== gameState.currentRound!.pretenderId);
  };

  const handleManualStart = () => {
    // Fallback celebrities based on common archetypes
    const fallbackCelebrities = [
      'Albert Einstein', 'Leonardo da Vinci', 'Napoleon Bonaparte', 
      'Cleopatra', 'William Shakespeare', 'Marie Curie',
      'Elvis Presley', 'Marilyn Monroe', 'Nelson Mandela',
      'Gandhi', 'Queen Elizabeth II', 'Steve Jobs',
      'Michael Jackson', 'Beethoven', 'Julius Caesar'
    ];
    const randomCelebrity = fallbackCelebrities[Math.floor(Math.random() * fallbackCelebrities.length)];
    
    setIsRequestingCelebrity(false);
    onManualStartRound(randomCelebrity);
  };

  if (!gameState.currentRound && gameState.completedRounds.length === 0) {
    const pretender = gameState.participants[gameState.currentPretenderIndex];
    return (
      <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            🎭 Celebrity Guess
          </h2>
          <button onClick={onClose} className="text-gray-300 hover:text-white transition-colors">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="text-center py-12">
          <div className="inline-block w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-lg text-gray-300">Waiting for {pretender.name} to choose a celebrity...</p>
          <p className="text-sm text-gray-500 mt-2">This may take a moment</p>
          
          <div className="mt-8 p-4 bg-slate-800/50 rounded-xl border border-gray-700 max-w-md mx-auto">
            <p className="text-sm text-gray-400 mb-3">Taking too long? Check the CLI for any errors, or:</p>
            <button
              onClick={handleManualStart}
              className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold py-2 px-6 rounded-lg transition-all"
            >
              ⚡ Skip & Use Random Celebrity
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center p-5 border-b-2 border-purple-500/30 bg-slate-900/50 backdrop-blur">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            🎭 Celebrity Guess
          </h2>
          {gameState.currentRound && (
            <p className="text-sm text-gray-400 mt-1">
              Round {gameState.currentRound.roundNumber} • {gameState.currentRound.pretenderName} is the celebrity
            </p>
          )}
        </div>
        <button onClick={onClose} className="text-gray-300 hover:text-white transition-colors">
          <CloseIcon className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 grid grid-cols-3 gap-5 p-5 overflow-hidden">
        {/* Left: Current Round Info */}
        <div className="space-y-4 overflow-auto custom-scrollbar">
          {gameState.currentRound && (
            <>
              <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-xl p-5 border-2 border-purple-500/40 shadow-xl">
                <h3 className="font-bold text-xl text-purple-300 mb-3 flex items-center justify-center gap-2">
                  <span className="text-2xl">🎭</span> The Celebrity
                </h3>
                <div className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-4">
                  {getParticipantAvatar(
                    gameState.participants.find(p => p.id === gameState.currentRound!.pretenderId)!
                  )}
                  <div>
                    <p className="font-bold text-lg">{gameState.currentRound.pretenderName}</p>
                    <p className="text-sm text-gray-400">is pretending to be someone famous</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 rounded-xl p-5 border-2 border-cyan-500/40 shadow-xl">
                <h3 className="font-bold text-lg text-cyan-300 mb-3 flex items-center gap-2">
                  <span>🎯</span> Guessers
                </h3>
                <div className="space-y-2">
                  {getGuessers().map(guesser => {
                    const remaining = celebrityGuessService.getRemainingGuesses(gameState, guesser.id);
                    const hasWon = gameState.currentRound!.winnerId === guesser.id;
                    return (
                      <div
                        key={guesser.id}
                        className={`flex items-center justify-between bg-slate-800/50 rounded-lg p-3 ${
                          hasWon ? 'border-2 border-green-500' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {getParticipantAvatar(guesser)}
                          <span className="font-medium">{guesser.name}</span>
                        </div>
                        <span className={`text-xs font-bold ${remaining === 0 ? 'text-red-400' : 'text-cyan-400'}`}>
                          {hasWon ? '👑 Winner!' : `${remaining}/5 guesses`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {!gameState.isActive && (
            <div className="bg-gradient-to-r from-green-900/50 to-emerald-900/50 rounded-xl p-5 border-2 border-green-500/40">
              <h3 className="font-bold text-xl text-green-300 mb-2">🎮 Game Over!</h3>
              <p className="text-sm text-gray-300">Total rounds: {gameState.completedRounds.length}</p>
            </div>
          )}
        </div>

        {/* Middle: Questions & Guesses */}
        <div className="space-y-4 overflow-auto custom-scrollbar">
          {gameState.currentRound && (
            <>
              {/* Ask Question */}
              <div className="bg-gradient-to-br from-blue-900/50 to-slate-800/50 rounded-xl p-4 border-2 border-blue-500/40 shadow-xl">
                <h3 className="font-bold text-lg text-blue-300 mb-3 flex items-center gap-2">
                  ❓ Ask a Question
                </h3>
                <div className="space-y-3">
                  <select
                    value={selectedAskerId}
                    onChange={(e) => setSelectedAskerId(e.target.value)}
                    className="w-full bg-slate-700 border-2 border-slate-600 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={gameState.currentRound.isComplete}
                  >
                    <option value="">Who is asking?</option>
                    {getGuessers().map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={questionInput}
                    onChange={(e) => setQuestionInput(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    placeholder="Ask a Yes/No question..."
                    className="w-full bg-slate-700 border-2 border-slate-600 rounded-lg px-3 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleAskQuestion()}
                    disabled={gameState.currentRound.isComplete}
                  />
                  <button
                    onClick={handleAskQuestion}
                    disabled={!selectedAskerId || !questionInput.trim() || gameState.currentRound.isComplete}
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold py-3 rounded-lg disabled:opacity-50 disabled:from-gray-600 disabled:to-gray-700 transition-all"
                  >
                    📤 Ask Question
                  </button>
                </div>
              </div>

              {/* Make Guess */}
              <div className="bg-gradient-to-br from-green-900/50 to-slate-800/50 rounded-xl p-4 border-2 border-green-500/40 shadow-xl">
                <h3 className="font-bold text-lg text-green-300 mb-3 flex items-center gap-2">
                  🎯 Make a Guess
                </h3>
                <div className="space-y-3">
                  <select
                    value={selectedGuesserId}
                    onChange={(e) => setSelectedGuesserId(e.target.value)}
                    className="w-full bg-slate-700 border-2 border-slate-600 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={gameState.currentRound.isComplete}
                  >
                    <option value="">Who is guessing?</option>
                    {getGuessers().map(p => {
                      const remaining = celebrityGuessService.getRemainingGuesses(gameState, p.id);
                      return (
                        <option key={p.id} value={p.id} disabled={remaining === 0}>
                          {p.name} ({remaining}/5 guesses left)
                        </option>
                      );
                    })}
                  </select>
                  <input
                    type="text"
                    value={guessInput}
                    onChange={(e) => setGuessInput(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    placeholder="Guess the celebrity's name..."
                    className="w-full bg-slate-700 border-2 border-slate-600 rounded-lg px-3 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleMakeGuess()}
                    disabled={gameState.currentRound.isComplete}
                  />
                  <button
                    onClick={handleMakeGuess}
                    disabled={!selectedGuesserId || !guessInput.trim() || gameState.currentRound.isComplete}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-3 rounded-lg disabled:opacity-50 disabled:from-gray-600 disabled:to-gray-700 transition-all"
                  >
                    🎲 Submit Guess
                  </button>
                </div>
              </div>

              {gameState.currentRound.isComplete && (
                <button
                  onClick={handleNextRound}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg text-lg"
                >
                  ▶️ Next Round
                </button>
              )}

              {!gameState.currentRound.isComplete && (
                <button
                  onClick={handleEndGame}
                  className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold py-3 rounded-xl transition-all"
                >
                  🛑 End Game
                </button>
              )}
            </>
          )}
        </div>

        {/* Right: Game Log */}
        <div className="bg-gradient-to-br from-purple-900/50 to-slate-800/50 rounded-xl p-5 border-2 border-purple-500/40 shadow-xl overflow-hidden flex flex-col">
          <h3 className="font-bold text-lg text-purple-300 mb-3 flex items-center gap-2">
            <span>📜</span> Game Log
          </h3>
          <div className="flex-1 overflow-auto space-y-2 text-sm custom-scrollbar">
            {gameState.gameLog.map((log, idx) => (
              <p
                key={idx}
                className={`p-2 rounded ${
                  log.startsWith('🎉') || log.startsWith('👑') ? 'text-green-300 font-semibold bg-green-900/20' :
                  log.startsWith('❌') ? 'text-red-300 bg-red-900/20' :
                  log.startsWith('❓') ? 'text-blue-300 bg-blue-900/20' :
                  log.startsWith('💬') ? 'text-cyan-300 bg-cyan-900/20' :
                  log.includes('═══') || log.includes('---') ? 'text-purple-400 font-bold text-center' :
                  log.startsWith('🎭') ? 'text-purple-300 font-semibold bg-purple-900/20' :
                  'text-gray-300 bg-slate-800/30'
                }`}
              >
                {log}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

