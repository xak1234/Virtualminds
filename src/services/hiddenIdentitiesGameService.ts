import type { Personality } from '../types';

export interface SecretIdentity {
  role: string;
  description: string;
}

export interface GameMind {
  personality: Personality;
  secretIdentity?: SecretIdentity;
  isNeutral: boolean;
}

export interface TeamGuess {
  mindId: string;
  guessedRole: string;
  isCorrect: boolean;
}

export interface Team {
  id: 'team1' | 'team2';
  name: string;
  selectedMindIds: string[];
  guesses: TeamGuess[];
  questionsAsked: number;
}

export interface GameState {
  isActive: boolean;
  minds: GameMind[];
  teams: [Team, Team];
  currentTeam: 'team1' | 'team2';
  theme: string;
  gameLog: string[];
  identitiesRevealed: number;
  gameOver: boolean;
  winner: 'team1' | 'team2' | null;
}

// Theme templates for secret identities
const IDENTITY_THEMES = {
  'space-crew': [
    { role: 'Captain', description: 'Commands the ship and makes final decisions' },
    { role: 'Engineer', description: 'Maintains ship systems and repairs damage' },
    { role: 'Medic', description: 'Provides medical care to the crew' },
    { role: 'Navigator', description: 'Plots courses and manages navigation' },
    { role: 'Security Officer', description: 'Protects the crew and handles threats' },
    { role: 'Scientist', description: 'Conducts research and experiments' },
    { role: 'Communications Officer', description: 'Manages all external communications' },
  ],
  'medieval-court': [
    { role: 'King', description: 'Rules the kingdom with absolute authority' },
    { role: 'Spy', description: 'Gathers intelligence and secrets' },
    { role: 'Assassin', description: 'Eliminates threats to the throne' },
    { role: 'Jester', description: 'Entertains and provides counsel through humor' },
    { role: 'Monk', description: 'Provides spiritual guidance and wisdom' },
    { role: 'Knight', description: 'Protects the realm and upholds honor' },
    { role: 'Advisor', description: 'Counsels the king on matters of state' },
  ],
  'futuristic-corporations': [
    { role: 'Hacker', description: 'Infiltrates systems and steals data' },
    { role: 'CEO', description: 'Leads the corporation with strategic vision' },
    { role: 'Android', description: 'Artificial being serving corporate interests' },
    { role: 'Engineer', description: 'Develops cutting-edge technology' },
    { role: 'Rogue AI', description: 'Self-aware AI pursuing its own agenda' },
    { role: 'Security Chief', description: 'Protects corporate assets and data' },
    { role: 'Marketing Director', description: 'Shapes public perception and branding' },
  ],
};

export class HiddenIdentitiesGameService {
  private static instance: HiddenIdentitiesGameService;
  private gameState: GameState | null = null;

  private constructor() {}

  static getInstance(): HiddenIdentitiesGameService {
    if (!HiddenIdentitiesGameService.instance) {
      HiddenIdentitiesGameService.instance = new HiddenIdentitiesGameService();
    }
    return HiddenIdentitiesGameService.instance;
  }

  /**
   * Initialize a new game with available personalities
   */
  initializeGame(
    personalities: Personality[],
    theme: keyof typeof IDENTITY_THEMES = 'futuristic-corporations'
  ): GameState {
    if (personalities.length < 10) {
      throw new Error('At least 10 personalities required to play. Please load more minds.');
    }

    // Get identity templates for the theme
    const identityTemplates = IDENTITY_THEMES[theme];
    
    // Shuffle personalities
    const shuffled = [...personalities].sort(() => Math.random() - 0.5);
    
    // Select 5 for secret identities
    const secretMinds = shuffled.slice(0, 5);
    const neutralMinds = shuffled.slice(5);

    // Randomly assign identities
    const shuffledIdentities = [...identityTemplates].sort(() => Math.random() - 0.5);
    
    const minds: GameMind[] = [
      ...secretMinds.map((p, i) => ({
        personality: p,
        secretIdentity: shuffledIdentities[i],
        isNeutral: false,
      })),
      ...neutralMinds.map(p => ({
        personality: p,
        secretIdentity: undefined,
        isNeutral: true,
      })),
    ];

    // Shuffle all minds together
    minds.sort(() => Math.random() - 0.5);

    this.gameState = {
      isActive: true,
      minds,
      teams: [
        {
          id: 'team1',
          name: 'Team Alpha',
          selectedMindIds: [],
          guesses: [],
          questionsAsked: 0,
        },
        {
          id: 'team2',
          name: 'Team Beta',
          selectedMindIds: [],
          guesses: [],
          questionsAsked: 0,
        },
      ],
      currentTeam: 'team1',
      theme,
      gameLog: ['Game initialized. Select 5 minds for each team.'],
      identitiesRevealed: 0,
      gameOver: false,
      winner: null,
    };

    return this.gameState;
  }

  /**
   * Get current game state
   */
  getGameState(): GameState | null {
    return this.gameState;
  }

  /**
   * Select minds for a team (must be 5)
   */
  selectTeamMinds(teamId: 'team1' | 'team2', mindIds: string[]): void {
    if (!this.gameState) throw new Error('No active game');
    
    if (mindIds.length !== 5) {
      throw new Error('Each team must select exactly 5 minds');
    }

    const team = this.gameState.teams.find(t => t.id === teamId);
    if (!team) throw new Error('Invalid team');

    // Check for overlaps with other team
    const otherTeam = this.gameState.teams.find(t => t.id !== teamId);
    const overlap = mindIds.some(id => otherTeam?.selectedMindIds.includes(id));
    if (overlap) {
      throw new Error('Teams cannot select the same minds');
    }

    team.selectedMindIds = mindIds;
    this.gameState.gameLog.push(`${team.name} selected their minds.`);
  }

  /**
   * Ask a Yes/No question to a specific mind
   */
  askQuestion(
    teamId: 'team1' | 'team2',
    mindId: string,
    question: string,
    targetRole: string
  ): { answer: 'yes' | 'no'; explanation: string } {
    if (!this.gameState) throw new Error('No active game');
    
    const team = this.gameState.teams.find(t => t.id === teamId);
    if (!team) throw new Error('Invalid team');

    if (this.gameState.currentTeam !== teamId) {
      throw new Error('Not your turn');
    }

    const mind = this.gameState.minds.find(m => m.personality.id === mindId);
    if (!mind) throw new Error('Mind not found');

    team.questionsAsked++;

    let answer: 'yes' | 'no';
    let explanation: string;

    // Neutral minds answer based on whether they know about the role
    if (mind.isNeutral) {
      // Check if the asked role exists in any secret identity
      const roleExists = this.gameState.minds.some(
        m => !m.isNeutral && m.secretIdentity?.role.toLowerCase() === targetRole.toLowerCase()
      );
      answer = roleExists ? 'yes' : 'no';
      explanation = `As a neutral observer, I can ${answer === 'yes' ? 'confirm' : 'deny'} that role exists among us.`;
    } else {
      // Secret identity minds answer about themselves
      const isTheirRole = mind.secretIdentity?.role.toLowerCase() === targetRole.toLowerCase();
      answer = isTheirRole ? 'yes' : 'no';
      explanation = isTheirRole
        ? `Yes, that is my role.`
        : `No, that is not my role.`;
    }

    this.gameState.gameLog.push(
      `${team.name} asked ${mind.personality.name}: "${question}" (about ${targetRole}) - Answer: ${answer.toUpperCase()}`
    );

    // Switch turns
    this.gameState.currentTeam = teamId === 'team1' ? 'team2' : 'team1';

    return { answer, explanation };
  }

  /**
   * Make a guess about a mind's secret identity
   */
  makeGuess(
    teamId: 'team1' | 'team2',
    mindId: string,
    guessedRole: string
  ): { correct: boolean; actualRole?: string; gameOver: boolean } {
    if (!this.gameState) throw new Error('No active game');

    const team = this.gameState.teams.find(t => t.id === teamId);
    if (!team) throw new Error('Invalid team');

    const mind = this.gameState.minds.find(m => m.personality.id === mindId);
    if (!mind) throw new Error('Mind not found');

    // Check if this identity was already guessed correctly
    const alreadyGuessed = [...this.gameState.teams[0].guesses, ...this.gameState.teams[1].guesses]
      .some(g => g.mindId === mindId && g.isCorrect);
    
    if (alreadyGuessed) {
      throw new Error('This identity has already been correctly guessed');
    }

    // Check guess limit for this specific identity (2 guesses total per team)
    const teamGuessesForMind = team.guesses.filter(g => g.mindId === mindId);
    if (teamGuessesForMind.length >= 2) {
      throw new Error('Your team has already made 2 guesses for this mind');
    }

    const isCorrect = !mind.isNeutral && 
      mind.secretIdentity?.role.toLowerCase() === guessedRole.toLowerCase();

    const guess: TeamGuess = {
      mindId,
      guessedRole,
      isCorrect,
    };

    team.guesses.push(guess);

    if (isCorrect) {
      this.gameState.identitiesRevealed++;
      this.gameState.gameLog.push(
        `🎯 ${team.name} correctly identified ${mind.personality.name} as ${guessedRole}!`
      );
    } else {
      this.gameState.gameLog.push(
        `❌ ${team.name} incorrectly guessed ${mind.personality.name} as ${guessedRole}`
      );
    }

    // Check if game is over (all 5 identities revealed)
    if (this.gameState.identitiesRevealed === 5) {
      this.endGame();
    }

    return {
      correct: isCorrect,
      actualRole: mind.secretIdentity?.role,
      gameOver: this.gameState.gameOver,
    };
  }

  /**
   * End the game and determine winner
   */
  private endGame(): void {
    if (!this.gameState) return;

    this.gameState.gameOver = true;

    const team1CorrectGuesses = this.gameState.teams[0].guesses.filter(g => g.isCorrect).length;
    const team2CorrectGuesses = this.gameState.teams[1].guesses.filter(g => g.isCorrect).length;

    // Winner is team with more correct guesses, or if tied, fewer total guesses
    if (team1CorrectGuesses > team2CorrectGuesses) {
      this.gameState.winner = 'team1';
    } else if (team2CorrectGuesses > team1CorrectGuesses) {
      this.gameState.winner = 'team2';
    } else {
      // Tied on correct guesses, check total guesses
      const team1TotalGuesses = this.gameState.teams[0].guesses.length;
      const team2TotalGuesses = this.gameState.teams[1].guesses.length;
      
      if (team1TotalGuesses < team2TotalGuesses) {
        this.gameState.winner = 'team1';
      } else if (team2TotalGuesses < team1TotalGuesses) {
        this.gameState.winner = 'team2';
      } else {
        this.gameState.winner = null; // Perfect tie
      }
    }

    const winnerTeam = this.gameState.winner 
      ? this.gameState.teams.find(t => t.id === this.gameState!.winner)
      : null;

    this.gameState.gameLog.push(
      '═══════════════════════════════════════',
      '🎮 GAME OVER 🎮',
      '═══════════════════════════════════════',
      winnerTeam 
        ? `🏆 ${winnerTeam.name} WINS!`
        : '🤝 Perfect tie!',
      '',
      `Team Alpha: ${team1CorrectGuesses} correct, ${this.gameState.teams[0].guesses.length} total guesses`,
      `Team Beta: ${team2CorrectGuesses} correct, ${this.gameState.teams[1].guesses.length} total guesses`,
      '═══════════════════════════════════════'
    );
  }

  /**
   * Reveal all identities (for end of game)
   */
  revealAllIdentities(): Array<{ name: string; role: string | null; description?: string }> {
    if (!this.gameState) return [];

    return this.gameState.minds.map(m => ({
      name: m.personality.name,
      role: m.secretIdentity?.role || null,
      description: m.secretIdentity?.description,
    }));
  }

  /**
   * Reset/end the current game
   */
  endCurrentGame(): void {
    if (this.gameState) {
      this.gameState.isActive = false;
      this.gameState = null;
    }
  }

  /**
   * Get available themes
   */
  static getAvailableThemes(): Array<{ key: string; name: string }> {
    return [
      { key: 'space-crew', name: 'Space Crew' },
      { key: 'medieval-court', name: 'Medieval Court' },
      { key: 'futuristic-corporations', name: 'Futuristic Corporations' },
    ];
  }
}

export const hiddenIdentitiesGameService = HiddenIdentitiesGameService.getInstance();

