# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

The Criminal Minds Framework is a React/TypeScript application that creates AI-powered personality chat interfaces. It supports multiple AI providers (Google Gemini, OpenAI, Local models), text-to-speech capabilities, and multi-personality conversations.

## Essential Development Commands

### Core Development
```bash
# Install dependencies
npm install

# Start development server (default port 3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Start production server with custom port/host
npm run start
```

### Local AI Model Integration
```bash
# Set up llama.cpp server for local GGUF models
npm run llama:setup

# Start llama.cpp server
npm run llama:start

# Development with local llama server (runs both llama server and vite)
npm run dev:llama
```

### Environment Setup
```bash
# Copy API keys template for local development
cp api-keys.example.json api-keys.json

# Windows batch script for local models setup
setup-local-models.bat
```

## API Keys Configuration

The application supports dual API key management:
- **Development**: Uses `api-keys.json` (gitignored) served by Vite
- **Production**: Fetches from `https://criminaminds2.onrender.com/api/keys`

Required keys in `api-keys.json`:
```json
{
  "geminiApiKey": "your-gemini-key",
  "openaiApiKey": "your-openai-key", 
  "elevenlabsApiKey": "your-elevenlabs-key",
  "openaiTtsApiKey": "your-openai-tts-key",
  "geminiTtsApiKey": "your-google-cloud-tts-key"
}
```

## Architecture Overview

### Core Application Structure
- **App.tsx**: Main application container managing state, personality system, and AI providers
- **types.ts**: Central type definitions for personalities, chat messages, configurations
- **constants.ts**: Application constants including models, commands, and storage keys

### Key Services (`services/`)
- **apiKeyService.ts**: Manages API key fetching with development/production detection
- **personalityService.ts**: Handles personality CRUD operations and localStorage persistence
- **geminiService.ts / openaiService.ts**: AI provider interfaces with token tracking
- **localModelService.ts**: WebLLM browser-based inference
- **llamaCppService.ts**: llama.cpp server integration for local GGUF models
- **ttsService.ts**: Text-to-speech abstraction (Browser, ElevenLabs, OpenAI)
- **costTrackingService.ts**: API usage and cost monitoring

### Component Architecture (`components/`)
- **ChatWindow.tsx**: Individual personality chat interface with speech recognition
- **PersonalityPanel.tsx**: Personality management and selection interface
- **Cli.tsx**: Terminal-like command interface for advanced operations
- **DraggableWindow.tsx**: Window management system for multi-personality chats
- **SettingsModal.tsx**: Configuration interface for APIs, models, and preferences

### State Management Patterns
- **React useState/useEffect**: Primary state management
- **localStorage**: Persistence for personalities, user profiles, settings
- **Service layer**: Business logic abstraction from UI components

## AI Provider Integration

### Supported Providers
1. **Google Gemini** (default): `gemini-1.5-pro`, `gemini-1.5-flash`
2. **OpenAI**: `gpt-4o`, `gpt-4o-mini`, `gpt-3.5-turbo`
3. **Local Models**: WebLLM (browser) or llama.cpp server

### Local Model Support
Two approaches for offline inference:
1. **WebLLM**: Browser-based with models like `TinyLlama-1.1B`, `Qwen2.5-0.5B`
2. **llama.cpp**: External server for GGUF models via OpenAI-compatible API

Environment variables:
```env
VITE_USE_LLAMA_SERVER=true
VITE_LLAMA_BASE_URL=http://127.0.0.1:8080
```

## Personality System

### Personality Structure
Each personality contains:
- **prompt**: Core character instructions
- **knowledge**: Contextual information base  
- **config**: Model parameters (temperature, tokens, etc.)
- **visiblePersonalityIds**: Cross-personality awareness system
- **ttsEnabled**: Individual voice settings
- **profileImage**: Optional avatar

### Import/Export
- **ZIP Import**: Supports `knowledge.txt`, `prompt.txt`, `config.json`, profile images
- **Profile Management**: User-specific personality collections with auto-save

## CLI Command System

The application includes a powerful CLI accessible via the terminal interface:

### Core Commands
- `help`: Show all available commands
- `person [name]`: Chat with specific personality or open window
- `list`: Show all loaded personalities  
- `clear [name]`: Clear conversation history
- `api provider [google|openai|local]`: Switch AI provider
- `api model [model-name]`: Change model or list available models

### Conversation Management
- `converse [name1] [name2] [topic]`: Start 2+ personality conversation
- `converse all [topic]`: Group conversation with all open windows
- `converse stop/off`: Stop all ongoing conversations
- `link [source] [target]` / `link all`: Create personality visibility relationships
- `unlink [source] [target]` / `unlink all`: Remove visibility links

### Local Model Commands  
- `local load [model-id]`: Download and load WebLLM model
- `local list`: Show available models
- `local test`: Test connectivity to llama.cpp server

## Development Patterns

### State Updates
- Use functional updates for complex state (e.g., `setUsers(prev => ...)`)
- Persist critical state to localStorage immediately after changes
- Handle race conditions in chat history with proper state synchronization

### Error Handling  
- Service layer returns structured responses with success/error states
- UI displays user-friendly error messages via CLI or modals
- Graceful degradation when API keys or services are unavailable

### Performance Considerations
- API key caching (5-minute duration) to reduce server calls
- Lazy loading of heavy dependencies (ElevenLabs, transformers)
- Efficient re-renders through proper dependency arrays in useEffect

### File Organization
- Absolute imports using `@/` alias (configured in vite.config.ts)
- Services maintain single responsibility and clear interfaces
- Components follow container/presentational pattern where appropriate

## TTS Integration

### Voice Providers
1. **Browser**: Native Web Speech API
2. **ElevenLabs**: High-quality voices with personality-specific voice IDs
3. **OpenAI**: GPT-4 TTS models
4. **Google Cloud TTS**: Used by geminiTtsService (requires geminiTtsApiKey)

### Voice Management
- Automatic voice assignment based on personality names
- Per-session TTS enable/disable in chat windows
- Global TTS toggle with spacebar skip in conversations

## Testing and Debugging

### Development Tools
- Browser console shows detailed API key loading, model initialization
- CLI provides real-time feedback for all operations
- Error states displayed in both UI and CLI contexts

### Common Issues
- **API Key Loading**: Check browser network tab for 404s on `api-keys.json`
- **Local Models**: Verify llama.cpp server running on correct port (8080)
- **TTS Issues**: Check browser microphone permissions and supported TTS providers

## Production Deployment

### Build Process
- Vite handles asset optimization and chunking
- Environment variables injected at build time via `vite.config.ts`
- Static assets (background images) resolved at build time for production URLs

### Deployment Targets
- **Render**: Primary production environment with API key endpoint
- **Local Preview**: `npm run start` for testing production builds locally
- **Development**: Hot reload with local API key file support

## Special Considerations

### Security
- API keys never committed to repository
- Local API key file (`api-keys.json`) explicitly gitignored
- Production keys served from secure server endpoint

### Browser Compatibility
- Modern browser features: Web Speech API, localStorage, ES2022
- Fallback UUID generation for older browsers
- Progressive enhancement for advanced features like speech recognition

### Multi-User Support
- User profiles with separate conversation histories
- Automatic personality profile saving per user
- Guest mode for unauthenticated usage