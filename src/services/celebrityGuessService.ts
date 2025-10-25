import type { Personality } from '../types';

export interface GuessAttempt {
  guesserId: string;
  guesserName: string;
  guess: string;
  isCorrect: boolean;
}

export interface Question {
  askerId: string;
  askerName: string;
  question: string;
  answer: 'yes' | 'no' | null;
}

export interface Round {
  pretenderId: string;
  pretenderName: string;
  celebrity: string;
  questions: Question[];
  guesses: GuessAttempt[];
  winnerId: string | null;
  winnerName: string | null;
  isComplete: boolean;
  roundNumber: number;
}

export interface CelebrityGuessGameState {
  isActive: boolean;
  participants: Personality[];
  currentRound: Round | null;
  completedRounds: Round[];
  currentPretenderIndex: number;
  gameLog: string[];
}

export class CelebrityGuessService {
  private static instance: CelebrityGuessService;

  private constructor() {}

  static getInstance(): CelebrityGuessService {
    if (!CelebrityGuessService.instance) {
      CelebrityGuessService.instance = new CelebrityGuessService();
    }
    return CelebrityGuessService.instance;
  }

  /**
   * Initialize a new game
   */
  initializeGame(participants: Personality[]): CelebrityGuessGameState {
    if (participants.length < 3) {
      throw new Error('At least 3 participants required to play.');
    }

    return {
      isActive: true,
      participants,
      currentRound: null,
      completedRounds: [],
      currentPretenderIndex: 0,
      gameLog: ['🎭 Celebrity Guess Game started!', 'Each mind will take turns being a celebrity.'],
    };
  }

  /**
   * Start a new round with a specific pretender
   */
  startNewRound(
    gameState: CelebrityGuessGameState,
    celebrity: string
  ): CelebrityGuessGameState {
    const pretender = gameState.participants[gameState.currentPretenderIndex];
    
    const newRound: Round = {
      pretenderId: pretender.id,
      pretenderName: pretender.name,
      celebrity,
      questions: [],
      guesses: [],
      winnerId: null,
      winnerName: null,
      isComplete: false,
      roundNumber: gameState.completedRounds.length + 1,
    };

    return {
      ...gameState,
      currentRound: newRound,
      gameLog: [
        ...gameState.gameLog,
        '',
        `═══ Round ${newRound.roundNumber} ═══`,
        `🎭 ${pretender.name} is now pretending to be a famous person!`,
        'Others must guess who they are. You can only ask Yes/No questions.',
        'Each player has 5 guesses total.',
      ],
    };
  }

  /**
   * Ask a question
   */
  askQuestion(
    gameState: CelebrityGuessGameState,
    askerId: string,
    question: string
  ): CelebrityGuessGameState {
    if (!gameState.currentRound) {
      throw new Error('No active round');
    }

    if (gameState.currentRound.isComplete) {
      throw new Error('Round is already complete');
    }

    if (askerId === gameState.currentRound.pretenderId) {
      throw new Error('The pretender cannot ask questions');
    }

    const asker = gameState.participants.find(p => p.id === askerId);
    if (!asker) {
      throw new Error('Asker not found');
    }

    const newQuestion: Question = {
      askerId,
      askerName: asker.name,
      question,
      answer: null, // Will be filled in by the AI response
    };

    return {
      ...gameState,
      currentRound: {
        ...gameState.currentRound,
        questions: [...gameState.currentRound.questions, newQuestion],
      },
      gameLog: [
        ...gameState.gameLog,
        `❓ ${asker.name} asks: "${question}"`,
      ],
    };
  }

  /**
   * Record answer to a question
   */
  recordAnswer(
    gameState: CelebrityGuessGameState,
    questionIndex: number,
    answer: 'yes' | 'no'
  ): CelebrityGuessGameState {
    if (!gameState.currentRound) {
      throw new Error('No active round');
    }

    const updatedQuestions = [...gameState.currentRound.questions];
    if (questionIndex >= updatedQuestions.length) {
      throw new Error('Invalid question index');
    }

    updatedQuestions[questionIndex] = {
      ...updatedQuestions[questionIndex],
      answer,
    };

    return {
      ...gameState,
      currentRound: {
        ...gameState.currentRound,
        questions: updatedQuestions,
      },
      gameLog: [
        ...gameState.gameLog,
        `💬 ${gameState.currentRound.pretenderName} answers: ${answer.toUpperCase()}`,
      ],
    };
  }

  /**
   * Make a guess
   */
  makeGuess(
    gameState: CelebrityGuessGameState,
    guesserId: string,
    guess: string
  ): CelebrityGuessGameState {
    if (!gameState.currentRound) {
      throw new Error('No active round');
    }

    if (gameState.currentRound.isComplete) {
      throw new Error('Round is already complete');
    }

    if (guesserId === gameState.currentRound.pretenderId) {
      throw new Error('The pretender cannot make guesses');
    }

    const guesser = gameState.participants.find(p => p.id === guesserId);
    if (!guesser) {
      throw new Error('Guesser not found');
    }

    // Check if guesser has already made 5 guesses
    const previousGuesses = gameState.currentRound.guesses.filter(
      g => g.guesserId === guesserId
    );
    if (previousGuesses.length >= 5) {
      throw new Error('You have already used all 5 guesses');
    }

    // Check if the guess is correct (case-insensitive, flexible matching)
    const isCorrect = this.isGuessCorrect(guess, gameState.currentRound.celebrity);

    const guessAttempt: GuessAttempt = {
      guesserId,
      guesserName: guesser.name,
      guess,
      isCorrect,
    };

    let updatedRound = {
      ...gameState.currentRound,
      guesses: [...gameState.currentRound.guesses, guessAttempt],
    };

    let newLog = [...gameState.gameLog];

    if (isCorrect) {
      // Winner found!
      updatedRound = {
        ...updatedRound,
        winnerId: guesserId,
        winnerName: guesser.name,
        isComplete: true,
      };
      newLog.push(
        `🎉 ${guesser.name} guessed correctly: ${guess}!`,
        `✨ The celebrity was ${gameState.currentRound.celebrity}`,
        `👑 ${guesser.name} wins this round!`
      );
    } else {
      newLog.push(
        `❌ ${guesser.name} guessed: "${guess}" - INCORRECT (${previousGuesses.length + 1}/5 guesses used)`
      );
    }

    return {
      ...gameState,
      currentRound: updatedRound,
      gameLog: newLog,
    };
  }

  /**
   * Check if a guess matches the celebrity name
   */
  private isGuessCorrect(guess: string, celebrity: string): boolean {
    const normalizeString = (s: string) => 
      s.toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .replace(/\s+/g, ' '); // Normalize spaces

    const normalizedGuess = normalizeString(guess);
    const normalizedCelebrity = normalizeString(celebrity);

    // Exact match
    if (normalizedGuess === normalizedCelebrity) return true;

    // Check if guess contains the celebrity name or vice versa
    if (normalizedGuess.includes(normalizedCelebrity) || normalizedCelebrity.includes(normalizedGuess)) {
      return true;
    }

    // Check individual words for partial matching (for compound names)
    const guessWords = normalizedGuess.split(' ');
    const celebrityWords = normalizedCelebrity.split(' ');

    // If all significant words from celebrity appear in guess, it's a match
    const significantWords = celebrityWords.filter(w => w.length > 2); // Ignore short words like "the", "of"
    if (significantWords.length > 0) {
      const allWordsMatch = significantWords.every(word =>
        guessWords.some(gw => gw.includes(word) || word.includes(gw))
      );
      if (allWordsMatch) return true;
    }

    return false;
  }

  /**
   * Complete the current round and move to next
   */
  completeRound(gameState: CelebrityGuessGameState): CelebrityGuessGameState {
    if (!gameState.currentRound) {
      throw new Error('No active round');
    }

    const completedRound = { ...gameState.currentRound, isComplete: true };
    const nextPretenderIndex = (gameState.currentPretenderIndex + 1) % gameState.participants.length;

    return {
      ...gameState,
      completedRounds: [...gameState.completedRounds, completedRound],
      currentRound: null,
      currentPretenderIndex: nextPretenderIndex,
      gameLog: [
        ...gameState.gameLog,
        '',
        '--- Round Complete ---',
        `Celebrity was: ${completedRound.celebrity}`,
        completedRound.winnerId 
          ? `Winner: ${completedRound.winnerName}` 
          : 'No one guessed correctly!',
      ],
    };
  }

  /**
   * Get remaining guesses for a player
   */
  getRemainingGuesses(gameState: CelebrityGuessGameState, playerId: string): number {
    if (!gameState.currentRound) return 0;
    
    const usedGuesses = gameState.currentRound.guesses.filter(
      g => g.guesserId === playerId
    ).length;
    
    return 5 - usedGuesses;
  }

  /**
   * End the game
   */
  endGame(gameState: CelebrityGuessGameState): CelebrityGuessGameState {
    return {
      ...gameState,
      isActive: false,
      gameLog: [
        ...gameState.gameLog,
        '',
        '═══════════════════════',
        '🎮 Game Over!',
        '═══════════════════════',
        `Total Rounds: ${gameState.completedRounds.length}`,
      ],
    };
  }
}

export const celebrityGuessService = CelebrityGuessService.getInstance();

