import { ApiProvider, ModelConfig } from './types';

export const AVAILABLE_MODELS = {
  [ApiProvider.GOOGLE]: ['gemini-2.5-flash'],
  [ApiProvider.OPENAI]: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  [ApiProvider.CLAUDE]: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
  [ApiProvider.LOCAL]: [
    'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',      // ~400MB - Recommended
    'TinyLlama-1.1B-Chat-v0.4-q4f16_1-MLC',   // ~700MB - Recommended  
    'Llama-3.2-1B-Instruct-q4f16_1-MLC',      // ~800MB - Recommended
    'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',      // ~1.2GB - Medium
    'gemma-2-2b-it-q4f16_1-MLC',              // ~1.5GB - Large
    'Phi-3.5-mini-instruct-q4f16_1-MLC',      // ~2.2GB - Very Large
    'Llama-3.2-3B-Instruct-q4f16_1-MLC'       // ~2.5GB - Largest
  ],
};

export const DEFAULT_PROVIDER = ApiProvider.GOOGLE;
export const DEFAULT_MODEL = AVAILABLE_MODELS[DEFAULT_PROVIDER][0];

export const DEFAULT_CONFIG: Required<ModelConfig> = {
  temperature: 0.8,  // Slightly higher for more variety
  topP: 0.9,         // Slightly lower to reduce repetitive patterns
  topK: 50,          // Higher for more diverse word choices
  maxOutputTokens: 4096,
  voiceId: '',
  additionalVoiceIds: [],
  googleTtsOptions: {},
  ttsRate: 1.0,
};

export const CLI_COMMANDS = {
  HELP: 'help',
  API: 'api',
  PERSON: 'person',
  CLEAR: 'clear',
  CONFIG: 'config',
  REGISTER: 'register',
  LOGIN: 'login',
  LOGOUT: 'logout',
  LOCK: 'lock',
  WHOAMI: 'whoami',
  REGEN: 'regen',
  UNDO: 'undo',
  LIST: 'list',
  LINK: 'link',
  UNLINK: 'unlink',
  EXIT: 'exit',
  QUIT: 'quit',
  CONVERSE: 'converse',
  MOOD: 'mood',
  USAGE: 'usage',
  SOUND: 'sound',
  SHADOW: 'shadow',
  LOCAL: 'local',
  TEST: 'test',
  LOAD: 'load',
  CONVERSE_LENGTH: 'converselength',
  ASSIGN_VOICES: 'assignvoices',
  VOICES: 'voices',
  VOICE_DEBUG: 'voicedebug',
  PROFILE: 'profile',
  AUTONOMOUS: 'autonomous',
  CLOSE_CHATS: 'close chats',
  CLOSE_ALL: 'close all',
  STOP: 'stop',
  SAY: 'say',
  CLAUDE: 'claude',
  DEBUG: 'debug',
  DEBUG_API: 'debug api',
  MIMIC: 'mimic',
  GAME: 'game',
  CHESS: 'chess',
  GAME2: 'game2',
  BRIBE: 'bribe',
  CRAFT: 'craft',
  STEAL: 'steal',
  INSERT: 'insert',
  UNLOAD: 'unload',
  GUIDE: 'guide',
  DIRECT_LLM: '@',
  LLM: 'llm',
};

export const CLI_SHORTCUTS: { [key: string]: string } = {
  'h': CLI_COMMANDS.HELP,
  'p': CLI_COMMANDS.PERSON,
  'ls': CLI_COMMANDS.LIST,
  'cfg': CLI_COMMANDS.CONFIG,
  'reg': CLI_COMMANDS.REGISTER,
  'cv': CLI_COMMANDS.CONVERSE,
  'm': CLI_COMMANDS.MOOD,
  'u': CLI_COMMANDS.USAGE,
  's': CLI_COMMANDS.SOUND,
  'sh': CLI_COMMANDS.SHADOW,
  'l': CLI_COMMANDS.LOCAL,
  't': CLI_COMMANDS.TEST,
  'cl': CLI_COMMANDS.CONVERSE_LENGTH,
  'av': CLI_COMMANDS.ASSIGN_VOICES,
  'v': CLI_COMMANDS.VOICES,
  'auto': CLI_COMMANDS.AUTONOMOUS,
  'q': CLI_COMMANDS.QUIT,
  'cc': CLI_COMMANDS.CLOSE_CHATS,
  'ca': CLI_COMMANDS.CLOSE_ALL,
  '!stop!': CLI_COMMANDS.STOP,
  'c': CLI_COMMANDS.CLAUDE,
  'dbg': CLI_COMMANDS.DEBUG,
  'dapi': CLI_COMMANDS.DEBUG_API,
  'inject': CLI_COMMANDS.MIMIC,
  'g': CLI_COMMANDS.GAME,
  'ch': CLI_COMMANDS.CHESS,
  'g2': CLI_COMMANDS.GAME2,
  'br': CLI_COMMANDS.BRIBE,
  'cf': CLI_COMMANDS.CRAFT,
  'st': CLI_COMMANDS.STEAL,
  'ins': CLI_COMMANDS.INSERT,
  'ul': CLI_COMMANDS.UNLOAD,
  'gd': CLI_COMMANDS.GUIDE,
};


export const HELP_MESSAGE = `
NOTE: Commands can be run in the CLI, or in a chat window with a '/' prefix (e.g., /help).
      When chatting with a personality in CLI, use '!' prefix to execute commands (e.g., !mood angry).
      Use '@' prefix to send messages directly to external LLM server (e.g., @ What is the capital of France?).
      Shortcuts are available (e.g., 'p' for 'person', 'cv' for 'converse', 'gd' for 'guide', 'm' for 'mood', 'u' for 'usage', 's' for 'sound').
      
CLI SHORTCUTS:
      Ctrl+F - Search CLI history    Ctrl+E - Toggle Standard/Error-Warning view
      ↑↓ or Ctrl+↑↓ - Command history    Tab - Auto-complete commands
      Home/End - Scroll to top/bottom    Page Up/Down - Page scroll

USER COMMANDS:
  register (reg) [user] - Create a new user profile.
  login [username]        - Log in to your profile.
  login admin [password]  - Admin login (requires password).
  logout                  - Log out of the current profile.
  lock                    - Lock screen and return to login.
  whoami                  - Show the current logged in user.
  load                    - Open personality selection modal to choose which to load.
  load llm                - Insert a local LLM as a mind named "LLM" in left panel.

SESSION COMMANDS:
  help (h)                - Shows this help message.
  guide (gd) [topic]      - Access framework documentation and guides.
                            'guide' shows all topics, 'guide <topic>' shows specific guide.
                            Topics: quickstart, commands, api-keys, tts, gangs, drugs, weapons, local, llm, games, experimental, debugging, admin, troubleshooting, docs
  @ [message]             - Send message directly to external LLM server.
                            Bypasses personality system and sends raw message to external AI.
                            Use 'llm' command to configure server URL.
                            Example: @ What is the weather like today?
  person (p) [name]       - Opens/focuses a chat window or starts a CLI chat.
                            If no name, shows focused personality.
  exit                    - Exit CLI chat mode, or if not in chat, reset application with confirmation.
  quit (q)                - Reset application and return to login screen (requires Y/N confirmation).
                            ⚠️  WARNING: This performs a complete system reset!
  list (ls)               - List all loaded personalities.
  regen                   - Regenerate the last AI response.
  undo                    - Remove your last message and the AI's response.
  clear [name]            - Clears history for a personality.
                            If no name, clears the active window's session.
  close chats (cc)        - Close all chat windows and stop all conversations.
  close all (ca)          - Close all windows and unload all personalities.
  unload (ul)             - Unload all personalities from desktop and close their chat windows.
                            Stops all conversations but keeps personalities saved in slots.
  stop (!stop!)           - 🛑 COMPREHENSIVE SYSTEM RESET:
                            • Unloads all personalities
                            • Closes all windows, games, and stops all conversations
                            • Disables TTS globally
                            • Resets all experimental settings to defaults
                            • Disables gang mode
                            • Resets mood to neutral
                            • Clears all gang events/conversations
                            Use this for a complete fresh start of the framework.

VISIBILITY & CONVERSATION:
  link [source] [target]  - Creates bidirectional awareness between personalities.
                            Both personalities will automatically see each other.
  link all                - Creates bidirectional links between all loaded personalities.
  unlink [source] [target]- Removes bidirectional visibility between personalities.
  unlink all              - Removes all links between all personalities.
  link [source]           - Lists all personalities linked to 'source'.
  converse (cv) [p1] [p2] [topic]
                          - Instructs p1 to start a conversation with p2
                            about the optional topic. Both must be linked.
  converse all [topic]    - Starts a group conversation with all loaded personalities
                            about the optional topic. All personalities must be linked.
  converse select         - Interactive personality selection for conversations.
  converse stop/off       - Stops all ongoing conversations between personalities.
  converselength (cl) [short|medium|long]
                          - Sets response length for conversations.
                            short: 1-2 sentences, medium: 1-2 paragraphs, long: detailed responses.
  autonomous (auto) [on|off] - Enable/disable autonomous personality communication.
                            When enabled, linked personalities can spontaneously message each other.
  mimic (inject) [source] [target] [message]
                          - Inject a message as if spoken by [source] to [target].
                            Auto-links them if needed. Useful to provoke interactions.
                            Example: mimic Alice Bob Hello there!

CONVERSATION CONTROLS:
  During conversations, press SPACEBAR to skip to the next person's response.
  say [message]            - Insert your message into any ongoing conversation.
                            All participating personalities will receive your message
                            and the conversation will continue naturally.

GAME COMMANDS:
  game (g)                 - Open "The Hidden Identities" game window.
                            Requires at least 10 loaded personalities.
                            Teams compete to identify 5 secret roles using Yes/No questions.
  chess (ch) [personality] - Play chess against a loaded personality.
                            Opens a chess board with integrated chat.
                            The AI's skill will match their character.
  game2 (g2)               - Play "Celebrity Guess" with loaded personalities.
                            Requires at least 3 personalities.
                            One mind pretends to be a celebrity, others guess who with Yes/No questions.

MOOD & BEHAVIOR:
  mood (m) [state]        - Sets emotional state for all personalities.
                            Use any mood you want (e.g., "filthy gagging", "mysteriously seductive").
                            Common moods: neutral, angry, loving, happy, sad, paranoid, aroused, stoned, drunk, horny.
                            If no state provided, shows current mood.
  sound (s) [on|off]      - Globally enables/disables TTS for all personalities.
                            When off, no personalities will speak regardless
                            of individual TTS settings. Shows status if no arg.
  voices (v)               - List ElevenLabs voices (name and voice_id) from your account.
  voicedebug               - Debug current voice assignments for all personalities.
  assignvoices (av)        - Assign hardcoded voice IDs based on known names.
  assignvoices auto        - Assign random ElevenLabs voices to personalities missing a voice_id.
  profile [list|export|import] - Manage user profiles with personality choices.
                            'list' shows all saved profiles, 'export [user]' exports profile,
                            'import [data]' imports profile from exported data.
      local (l) [list|load]   - Manage local AI models. 'list' shows available models with memory usage,
                                'load [model]' loads a specific model for local inference.
                                Recommended: Qwen2.5-0.5B (~400MB) or TinyLlama (~700MB) for best compatibility.
      test (t) [error|warning|all] - Test error/warning functionality. Generates sample messages.
                                'error' shows error test, 'warning' shows warning test, 'all' shows both.
                                By default, errors/warnings are hidden. Use Ctrl+E to toggle views.

ADMIN COMMANDS:
  usage (u)               - Shows Gemini API usage statistics and costs.
                            (Admin only - requires login as 'admin')
  claude [message]        - Chat with Claude AI assistant with full framework control.
                            Claude can manipulate personalities, settings, and configurations live.
                            (Admin only - requires login as 'admin')
  debug (dbg) [on|off|toggle|clear]
                          - Open/close the Admin Debug Window, or clear logs.
                            Shows background workings: system instructions, model calls, TTS selections/events, etc.
                            (Admin only - requires login as 'admin')
  debug api (dapi)        - Open the API Debug Monitor window.
                            Shows real-time API usage tracking, token counts, costs, and request logs
                            for all chat and TTS API calls across all providers.
                            (Admin only - requires login as 'admin')
  debug gangs [on|off|toggle|clear]
                          - Open/close the Gang Debug Monitor window.
                            Shows real-time gang stats, member status, territory control, and all gang events.
                            Requires gangs feature to be enabled in Experimental settings.
                            (Admin only - requires login as 'admin')

GANG WEAPONS COMMANDS (requires gangs + weapons enabled):
  bribe (br) [personality] [gun|shank|chain]
                          - Attempt to bribe a prison guard to smuggle in a weapon.
                            Costs gang resources. More corrupt guards = higher success.
                            Gun: expensive but deadly, Chain: moderate, Shank: cheap but weak.
                            Failed bribes may result in solitary confinement.
  craft (cf) [personality] [shank|chain]
                          - Craft an improvised weapon (guns cannot be crafted).
                            Success depends on personality's violence stat.
                            Crafted weapons start with lower durability.
  steal (st) [thief] [victim]
                          - Attempt to steal a weapon from another personality.
                            Only works if victim has weapons.
                            Increases thief's respect, decreases victim's.
  insert (ins)            - 🔓 GANG PRISON INSERTION:
                            • Enables gang mode if not already active
                            • Creates and loads "Spunker" personality
                            • Creates a personality representing YOU (current user)
                            • Inserts both into random rival gangs in the prison
                            • Opens gang debug window for monitoring
                            Your avatar will interact with other gang members!

CONFIG COMMANDS:
  api provider [name]     - Switch API provider (google, openai, claude).
  api model [model_name]  - Switch the AI model.
  api model               - Show available models for current provider.
  api model select        - Interactive model selection with arrow keys.
  config (cfg) [key] [val]- Configure model parameters.
                            Keys: temp, topP, topK, tokens.
                            e.g., 'cfg temp 0.8'
  llm [ip:port]           - Set LM Studio server URL (saved to user profile).
                            Example: llm 192.168.0.15:1234
                            If no arguments, shows current URL.

UI COMMANDS:
  shadow (sh) [on|off]    - Toggle semi-transparent CLI history overlay above the CLI.
`;

export const LOCAL_STORAGE_KEY = 'cmf_users';
export const PERSONALITIES_STORAGE_KEY = 'cmf_personalities';
export const THEME_STORAGE_KEY = 'cmf_theme';
export const STARFIELD_ENABLED_STORAGE_KEY = 'cmf_starfield_enabled';
export const STARFIELD_COUNT_STORAGE_KEY = 'cmf_starfield_count';
export const STARFIELD_SPEED_STORAGE_KEY = 'cmf_starfield_speed';
export const SHOOTING_STARS_ENABLED_STORAGE_KEY = 'cmf_shooting_stars_enabled';
export const TTS_PROVIDER_STORAGE_KEY = 'cmf_tts_provider';
export const ELEVENLABS_API_KEY_STORAGE_KEY = 'cmf_elevenlabs_api_key';
export const OPENAI_TTS_API_KEY_STORAGE_KEY = 'cmf_openai_tts_api_key';
export const GEMINI_TTS_API_KEY_STORAGE_KEY = 'cmf_gemini_tts_api_key';
export const GLOBAL_TTS_ENABLED_STORAGE_KEY = 'cmf_global_tts_enabled';
export const CLI_SHADOW_ENABLED_STORAGE_KEY = 'cmf_cli_shadow_enabled';
export const EXPORT_PATH_STORAGE_KEY = 'cmf_export_path';
export const CHAT_INPUT_COLOR_STORAGE_KEY = 'cmf_chat_input_color';
export const CHAT_AI_COLOR_STORAGE_KEY = 'cmf_chat_ai_color';
export const CLI_FONT_COLOR_STORAGE_KEY = 'cmf_cli_font_color';
export const CLI_BG_COLOR_STORAGE_KEY = 'cmf_cli_bg_color';
export const CHAT_WINDOW_BG_COLOR_STORAGE_KEY = 'cmf_chat_window_bg_color';
export const CHAT_WINDOW_ALPHA_STORAGE_KEY = 'cmf_chat_window_alpha';
export const CHAT_MESSAGE_ALPHA_STORAGE_KEY = 'cmf_chat_message_alpha';
export const DESKTOP_BACKGROUND_STORAGE_KEY = 'cmf_desktop_background';
export const PERSONALITY_PANEL_BG_COLOR_STORAGE_KEY = 'cmf_personality_panel_bg_color';
export const PERSONALITY_PANEL_BORDER_COLOR_STORAGE_KEY = 'cmf_personality_panel_border_color';
export const PERSONALITY_PANEL_FONT_COLOR_STORAGE_KEY = 'cmf_personality_panel_font_color';

// Quick-access personality slots (15 entries)
export const PERSONALITY_SLOTS_STORAGE_KEY = 'cmf_personality_slots';

// Developer convenience toggles
export const LINK_ALL_ON_STARTUP_STORAGE_KEY = 'cmf_link_all_on_startup';

// Chat API key overrides saved locally (used if server/local file keys are missing)
export const OPENAI_CHAT_API_KEY_STORAGE_KEY = 'cmf_openai_chat_api_key';
export const GEMINI_API_KEY_STORAGE_KEY = 'cmf_gemini_api_key';

// API Provider and Local Model state persistence
export const API_PROVIDER_STORAGE_KEY = 'cmf_api_provider';
export const CURRENT_MODEL_STORAGE_KEY = 'cmf_current_model';
export const CURRENT_LOCAL_MODEL_STORAGE_KEY = 'cmf_current_local_model';
export const MODEL_CONFIG_STORAGE_KEY = 'cmf_model_config';
export const LM_STUDIO_URL_STORAGE_KEY = 'cmf_lm_studio_url';

export const DEFAULT_EXPORT_PATH = 'Downloads';

// Available background images
export const AVAILABLE_BACKGROUNDS = [
  { name: 'Virtual 1', file: 'background.png' },
  { name: 'Virtual 2', file: 'background2.png' },
  { name: 'Virtual 3', file: 'background3.png' },
  { name: 'Virtual 4', file: 'baackground4.png' },
  { name: 'Poverty', file: 'poverty.png' },
];
