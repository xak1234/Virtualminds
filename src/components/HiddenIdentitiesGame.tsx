import React, { useState, useEffect } from 'react';
import type { Personality } from '../types';
import {
  hiddenIdentitiesGameService,
  type GameState,
  type GameMind,
  HiddenIdentitiesGameService,
} from '../services/hiddenIdentitiesGameService';
import { CloseIcon } from './icons/CloseIcon';
import { CpuChipIcon } from './icons/CpuChipIcon';

interface HiddenIdentitiesGameProps {
  personalities: Personality[];
  onClose: () => void;
}

export const HiddenIdentitiesGame: React.FC<HiddenIdentitiesGameProps> = ({
  personalities,
  onClose,
}) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<string>('futuristic-corporations');
  const [team1Selection, setTeam1Selection] = useState<string[]>([]);
  const [team2Selection, setTeam2Selection] = useState<string[]>([]);
  const [setupComplete, setSetupComplete] = useState(false);
  
  // Question asking state
  const [questionText, setQuestionText] = useState('');
  const [selectedMindId, setSelectedMindId] = useState<string>('');
  const [targetRole, setTargetRole] = useState('');
  const [lastAnswer, setLastAnswer] = useState<{ answer: string; explanation: string } | null>(null);
  
  // Guessing state
  const [guessingMindId, setGuessingMindId] = useState<string>('');
  const [guessedRole, setGuessedRole] = useState('');
  const [lastGuessResult, setLastGuessResult] = useState<string>('');

  const themes = HiddenIdentitiesGameService.getAvailableThemes();

  useEffect(() => {
    // Initialize game if enough personalities
    if (personalities.length >= 10 && !gameState) {
      try {
        const initialState = hiddenIdentitiesGameService.initializeGame(
          personalities,
          selectedTheme as any
        );
        setGameState(initialState);
      } catch (error) {
        console.error('Failed to initialize game:', error);
      }
    }
  }, [personalities, selectedTheme, gameState]);

  const handleThemeChange = (theme: string) => {
    setSelectedTheme(theme);
    setGameState(null); // Reset game to reinitialize with new theme
    setSetupComplete(false);
    setTeam1Selection([]);
    setTeam2Selection([]);
  };

  const toggleMindSelection = (mindId: string, team: 1 | 2) => {
    if (setupComplete) return;

    if (team === 1) {
      if (team1Selection.includes(mindId)) {
        setTeam1Selection(team1Selection.filter(id => id !== mindId));
      } else if (team1Selection.length < 5 && !team2Selection.includes(mindId)) {
        setTeam1Selection([...team1Selection, mindId]);
      }
    } else {
      if (team2Selection.includes(mindId)) {
        setTeam2Selection(team2Selection.filter(id => id !== mindId));
      } else if (team2Selection.length < 5 && !team1Selection.includes(mindId)) {
        setTeam2Selection([...team2Selection, mindId]);
      }
    }
  };

  const confirmTeamSelection = () => {
    if (team1Selection.length !== 5 || team2Selection.length !== 5) {
      console.log('Each team must select exactly 5 minds - auto-proceeding anyway');
      return;
    }

    try {
      hiddenIdentitiesGameService.selectTeamMinds('team1', team1Selection);
      hiddenIdentitiesGameService.selectTeamMinds('team2', team2Selection);
      setSetupComplete(true);
      setGameState(hiddenIdentitiesGameService.getGameState());
    } catch (error: any) {
      console.error('Team selection error:', error.message);
    }
  };

  const askQuestion = () => {
    if (!selectedMindId || !targetRole.trim()) {
      console.log('No mind or role specified for question - auto-proceeding anyway');
      return;
    }

    if (!gameState) return;

    try {
      const result = hiddenIdentitiesGameService.askQuestion(
        gameState.currentTeam,
        selectedMindId,
        questionText || `Are you the ${targetRole}?`,
        targetRole
      );
      setLastAnswer(result);
      setGameState(hiddenIdentitiesGameService.getGameState());
      setQuestionText('');
      setSelectedMindId('');
      setTargetRole('');
    } catch (error: any) {
      console.error('Question error:', error.message);
    }
  };

  const makeGuess = () => {
    if (!guessingMindId || !guessedRole.trim()) {
      console.log('No mind or role specified for guess - auto-proceeding anyway');
      return;
    }

    if (!gameState) return;

    try {
      const result = hiddenIdentitiesGameService.makeGuess(
        gameState.currentTeam,
        guessingMindId,
        guessedRole
      );
      
      if (result.correct) {
        setLastGuessResult(`✅ Correct! ${guessedRole} identified!`);
      } else {
        setLastGuessResult(`❌ Incorrect. ${result.actualRole ? `(Actual: ${result.actualRole})` : ''}`);
      }
      
      setGameState(hiddenIdentitiesGameService.getGameState());
      setGuessingMindId('');
      setGuessedRole('');

      if (result.gameOver) {
        setTimeout(() => {
          const identities = hiddenIdentitiesGameService.revealAllIdentities();
          console.log('Final identities:', identities);
        }, 1000);
      }
    } catch (error: any) {
      console.error('Guess error:', error.message);
    }
  };

  const getMindAvatar = (personality: Personality) => {
    if (personality.profileImage) {
      return (
        <img
          src={personality.profileImage}
          alt={personality.name}
          className="w-12 h-12 rounded-full object-cover"
        />
      );
    }
    return (
      <div className="w-12 h-12 rounded-full bg-base-600 flex items-center justify-center">
        <CpuChipIcon className="w-8 h-8 text-accent" />
      </div>
    );
  };

  if (!gameState) {
    return (
      <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            The Hidden Identities
          </h2>
          <button onClick={onClose} className="text-gray-300 hover:text-white transition-colors">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        
        {personalities.length < 10 ? (
          <div className="text-center py-12">
            <p className="text-xl text-red-400 mb-4 font-semibold">
              ⚠️ At least 10 personalities required to play
            </p>
            <p className="text-gray-300 text-lg">
              Currently loaded: {personalities.length}/10
            </p>
            <p className="text-sm text-gray-400 mt-4">
              Use the 'load' command to select more personalities
            </p>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-300 text-lg">Initializing game...</p>
          </div>
        )}
      </div>
    );
  }

  if (!setupComplete) {
    return (
      <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 overflow-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Setup: Team Selection
          </h2>
          <button onClick={onClose} className="text-gray-300 hover:text-white transition-colors">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Theme Selection */}
        <div className="mb-6 bg-slate-800/50 rounded-xl p-4 border border-cyan-500/20">
          <label className="block text-sm font-semibold mb-2 text-cyan-400">Select Theme:</label>
          <select
            value={selectedTheme}
            onChange={(e) => handleThemeChange(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white text-base font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          >
            {themes.map(theme => (
              <option key={theme.key} value={theme.key}>
                {theme.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-6 p-5 bg-gradient-to-r from-blue-900/40 to-cyan-900/40 rounded-xl border border-cyan-500/30 shadow-lg">
          <h3 className="font-bold mb-3 text-cyan-300 text-lg">📋 Instructions:</h3>
          <ul className="text-sm space-y-2 text-gray-200">
            <li className="flex items-start"><span className="text-cyan-400 mr-2">•</span><span>Each team selects exactly 5 minds</span></li>
            <li className="flex items-start"><span className="text-cyan-400 mr-2">•</span><span>Teams cannot select the same minds</span></li>
            <li className="flex items-start"><span className="text-cyan-400 mr-2">•</span><span>5 random minds have secret identities</span></li>
            <li className="flex items-start"><span className="text-cyan-400 mr-2">•</span><span>Other minds are neutral and answer Yes/No about identities</span></li>
          </ul>
        </div>

        <div className="flex-1 grid grid-cols-2 gap-6">
          {/* Team 1 Selection */}
          <div className="border-2 border-blue-500/50 rounded-xl p-5 bg-gradient-to-br from-blue-900/30 to-slate-800/50 backdrop-blur shadow-xl">
            <h3 className="text-xl font-bold text-blue-400 mb-4 flex items-center justify-center gap-2">
              <span className="text-2xl">🔵</span> Team Alpha ({team1Selection.length}/5)
            </h3>
            <div className="space-y-2 max-h-96 overflow-auto pr-2 custom-scrollbar">
              {gameState.minds.map(mind => (
                <div
                  key={mind.personality.id}
                  onClick={() => toggleMindSelection(mind.personality.id, 1)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                    team1Selection.includes(mind.personality.id)
                      ? 'bg-blue-600 border-2 border-blue-400 shadow-lg scale-105'
                      : team2Selection.includes(mind.personality.id)
                      ? 'bg-slate-700/30 opacity-40 cursor-not-allowed'
                      : 'bg-slate-700/50 hover:bg-slate-600/70 border-2 border-transparent hover:border-blue-400/30'
                  }`}
                >
                  {getMindAvatar(mind.personality)}
                  <span className="font-medium text-white">{mind.personality.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Team 2 Selection */}
          <div className="border-2 border-green-500/50 rounded-xl p-5 bg-gradient-to-br from-green-900/30 to-slate-800/50 backdrop-blur shadow-xl">
            <h3 className="text-xl font-bold text-green-400 mb-4 flex items-center justify-center gap-2">
              <span className="text-2xl">🟢</span> Team Beta ({team2Selection.length}/5)
            </h3>
            <div className="space-y-2 max-h-96 overflow-auto pr-2 custom-scrollbar">
              {gameState.minds.map(mind => (
                <div
                  key={mind.personality.id}
                  onClick={() => toggleMindSelection(mind.personality.id, 2)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                    team2Selection.includes(mind.personality.id)
                      ? 'bg-green-600 border-2 border-green-400 shadow-lg scale-105'
                      : team1Selection.includes(mind.personality.id)
                      ? 'bg-slate-700/30 opacity-40 cursor-not-allowed'
                      : 'bg-slate-700/50 hover:bg-slate-600/70 border-2 border-transparent hover:border-green-400/30'
                  }`}
                >
                  {getMindAvatar(mind.personality)}
                  <span className="font-medium text-white">{mind.personality.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={confirmTeamSelection}
          disabled={team1Selection.length !== 5 || team2Selection.length !== 5}
          className="mt-6 w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-600 disabled:to-gray-700 transition-all shadow-lg text-lg"
        >
          ✨ Confirm Team Selection & Start Game
        </button>
      </div>
    );
  }

  // Main game interface
  const currentTeam = gameState.teams.find(t => t.id === gameState.currentTeam)!;
  const team1 = gameState.teams[0];
  const team2 = gameState.teams[1];

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <div className="flex justify-between items-center p-3 sm:p-5 border-b-2 border-cyan-500/30 bg-slate-900/50 backdrop-blur">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent truncate">
            <span className="hidden sm:inline">The Hidden Identities</span>
            <span className="sm:hidden">Hidden Identities</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1 truncate">
            🎭 Theme: {themes.find(t => t.key === gameState.theme)?.name}
          </p>
        </div>
        <button onClick={onClose} className="text-gray-300 hover:text-white transition-colors p-1 flex-shrink-0">
          <CloseIcon className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>

      <div className="flex-1 grid grid-cols-3 gap-5 p-5 overflow-auto">
        {/* Left: Game Status & Teams */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-cyan-900/40 to-slate-800/50 rounded-xl p-5 border-2 border-cyan-500/30 shadow-xl">
            <h3 className="font-bold text-xl mb-3 text-cyan-300">🎮 Game Status</h3>
            <div className="space-y-2 text-sm">
              <p className="text-gray-200">
                <span className="font-semibold">Identities Revealed:</span> {gameState.identitiesRevealed}/5
              </p>
              <p className="font-semibold text-cyan-400 text-base mt-3">
                ⏱️ Current Turn: <span className="text-white">{currentTeam.name}</span>
              </p>
              {gameState.gameOver && (
                <p className="font-bold text-green-400 text-xl mt-3 animate-pulse">
                  {gameState.winner ? `🏆 ${gameState.teams.find(t => t.id === gameState.winner)?.name} WINS!` : '🤝 Tie!'}
                </p>
              )}
            </div>
          </div>

          {/* Team Scores */}
          <div className="bg-gradient-to-br from-blue-900/40 to-slate-800/50 rounded-xl p-4 border-2 border-blue-500/50 shadow-lg">
            <h4 className="font-bold text-blue-400 mb-2 text-lg flex items-center gap-2">
              <span>🔵</span> {team1.name}
            </h4>
            <div className="space-y-1 text-sm text-gray-200">
              <p>✅ Correct: <span className="font-bold text-white">{team1.guesses.filter(g => g.isCorrect).length}</span></p>
              <p>📊 Total Guesses: <span className="font-bold text-white">{team1.guesses.length}</span></p>
              <p>❓ Questions: <span className="font-bold text-white">{team1.questionsAsked}</span></p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-900/40 to-slate-800/50 rounded-xl p-4 border-2 border-green-500/50 shadow-lg">
            <h4 className="font-bold text-green-400 mb-2 text-lg flex items-center gap-2">
              <span>🟢</span> {team2.name}
            </h4>
            <div className="space-y-1 text-sm text-gray-200">
              <p>✅ Correct: <span className="font-bold text-white">{team2.guesses.filter(g => g.isCorrect).length}</span></p>
              <p>📊 Total Guesses: <span className="font-bold text-white">{team2.guesses.length}</span></p>
              <p>❓ Questions: <span className="font-bold text-white">{team2.questionsAsked}</span></p>
            </div>
          </div>

          {gameState.gameOver && (
            <button
              onClick={() => {
                const identities = hiddenIdentitiesGameService.revealAllIdentities();
                console.log(
                  'Final Identities:\n\n' +
                  identities
                    .map(i => `${i.name}: ${i.role || 'Neutral'} ${i.description ? `- ${i.description}` : ''}`)
                    .join('\n')
                );
              }}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg"
            >
              🔍 Reveal All Identities
            </button>
          )}
        </div>

        {/* Middle: Actions */}
        <div className="space-y-5">
          {!gameState.gameOver && (
            <>
              {/* Ask Question */}
              <div className="bg-gradient-to-br from-blue-900/40 to-slate-800/50 rounded-xl p-5 border-2 border-blue-500/30 shadow-xl">
                <h3 className="font-bold mb-4 text-blue-300 text-lg flex items-center gap-2">
                  ❓ Ask a Question
                </h3>
                <div className="space-y-3">
                  <select
                    value={selectedMindId}
                    onChange={(e) => setSelectedMindId(e.target.value)}
                    className="w-full bg-slate-700 border-2 border-slate-600 rounded-lg px-3 py-2.5 text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="" className="bg-slate-800">Select a mind...</option>
                    {gameState.minds.map(m => (
                      <option key={m.personality.id} value={m.personality.id} className="bg-slate-800">
                        {m.personality.name}
                      </option>
                    ))}
                  </select>
                  
                  <input
                    type="text"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    placeholder="Role to ask about (e.g., Hacker)"
                    className="w-full bg-slate-700 border-2 border-slate-600 rounded-lg px-3 py-2.5 text-white placeholder-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  
                  <input
                    type="text"
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    placeholder="Optional custom question"
                    className="w-full bg-slate-700 border-2 border-slate-600 rounded-lg px-3 py-2.5 text-white placeholder-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  
                  <button
                    onClick={askQuestion}
                    disabled={gameState.currentTeam !== currentTeam.id}
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold py-3 rounded-lg disabled:opacity-50 disabled:from-gray-600 disabled:to-gray-700 transition-all shadow-lg"
                  >
                    📤 Ask Question
                  </button>
                </div>
                
                {lastAnswer && (
                  <div className="mt-4 p-3 bg-slate-800/80 rounded-lg border border-cyan-500/30 text-sm">
                    <p className="font-bold text-cyan-300 text-base mb-1">{lastAnswer.answer.toUpperCase()}</p>
                    <p className="text-gray-200">{lastAnswer.explanation}</p>
                  </div>
                )}
              </div>

              {/* Make Guess */}
              <div className="bg-gradient-to-br from-green-900/40 to-slate-800/50 rounded-xl p-5 border-2 border-green-500/30 shadow-xl">
                <h3 className="font-bold mb-4 text-green-300 text-lg flex items-center gap-2">
                  🎯 Make a Guess
                </h3>
                <div className="space-y-3">
                  <select
                    value={guessingMindId}
                    onChange={(e) => setGuessingMindId(e.target.value)}
                    className="w-full bg-slate-700 border-2 border-slate-600 rounded-lg px-3 py-2.5 text-white font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="" className="bg-slate-800">Select a mind...</option>
                    {gameState.minds.map(m => (
                      <option key={m.personality.id} value={m.personality.id} className="bg-slate-800">
                        {m.personality.name}
                      </option>
                    ))}
                  </select>
                  
                  <input
                    type="text"
                    value={guessedRole}
                    onChange={(e) => setGuessedRole(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    placeholder="Guessed role (e.g., CEO)"
                    className="w-full bg-slate-700 border-2 border-slate-600 rounded-lg px-3 py-2.5 text-white placeholder-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  
                  <button
                    onClick={makeGuess}
                    disabled={gameState.currentTeam !== currentTeam.id}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-3 rounded-lg disabled:opacity-50 disabled:from-gray-600 disabled:to-gray-700 transition-all shadow-lg"
                  >
                    🎲 Submit Guess
                  </button>
                </div>
                
                {lastGuessResult && (
                  <div className="mt-4 p-3 bg-slate-800/80 rounded-lg border border-green-500/30">
                    <p className="text-gray-100 font-medium">{lastGuessResult}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right: Game Log */}
        <div className="bg-gradient-to-br from-purple-900/40 to-slate-800/50 rounded-xl p-5 border-2 border-purple-500/30 shadow-xl">
          <h3 className="font-bold mb-4 text-purple-300 text-lg flex items-center gap-2">
            📜 Game Log
          </h3>
          <div className="space-y-2 text-sm max-h-[600px] overflow-auto pr-2 custom-scrollbar">
            {gameState.gameLog.map((log, idx) => (
              <p
                key={idx}
                className={`p-2 rounded ${
                  log.startsWith('🎯') ? 'text-green-300 font-semibold bg-green-900/20' :
                  log.startsWith('❌') ? 'text-red-300 bg-red-900/20' :
                  log.includes('WIN') ? 'text-yellow-300 font-bold text-base bg-yellow-900/30 animate-pulse' :
                  log.includes('===') ? 'text-cyan-400 font-bold text-center' :
                  log.includes('GAME OVER') ? 'text-purple-300 font-bold text-center text-lg' :
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

