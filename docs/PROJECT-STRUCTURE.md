# Project Structure

This document describes the organization of the Criminal Minds Framework project after professional reorganization.

## 📁 Directory Structure

```
criminalminds2/
├── config/                    # All configuration files
│   ├── api-keys.example.json
│   ├── llama.config.json
│   ├── postcss.config.js
│   ├── render.yaml
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── voice-id-mappings.json
│
├── docs/                      # All documentation
│   ├── deployment/
│   ├── development/
│   ├── gangs/
│   ├── setup/
│   └── *.md files
│
├── docker/                    # Docker configuration
│   ├── docker-compose.yml
│   ├── Dockerfile.gpu
│   └── Dockerfile.tts
│
├── public/                    # Static assets served by Vite
│   ├── favicon.ico
│   ├── ident/                 # Personality zip files
│   ├── personalities/         # Personality zip files
│   └── voices/                # Voice files (.wav)
│
├── scripts/                   # Utility scripts
│   ├── conversion/
│   ├── llama/
│   ├── setup/
│   ├── testing/
│   ├── tts/
│   └── Various utility scripts
│
├── src/                       # Source code
│   ├── components/            # React components
│   │   ├── icons/
│   │   ├── images/
│   │   └── sounds/
│   ├── services/              # Business logic services
│   ├── App.tsx
│   ├── constants.ts
│   ├── index.css
│   ├── index.tsx
│   └── types.ts
│
├── dist/                      # Build output (generated)
│
├── node_modules/              # Dependencies (generated)
│
├── api-keys.json             # User's API keys (not in git)
├── index.html                 # Main HTML entry point
├── index.css                  # Global styles
├── package.json
├── package-lock.json
├── README.md
└── render.yaml               # Render.com deployment config
```

## 🎯 Key Organization Principles

### 1. **Configuration Files** (`config/`)
All build and runtime configuration files are centralized in the `config/` directory:
- Build configs: `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`
- App configs: `llama.config.json`, `voice-id-mappings.json`
- Deployment: `render.yaml`
- Examples: `api-keys.example.json`

### 2. **Documentation** (`docs/`)
All markdown documentation is organized in the `docs/` directory:
- User guides: `USER-GUIDE.md`, `QUICK-REFERENCE.md`, `FAQ.md`
- Setup guides: `API-KEYS-SETUP.md`, `SELF-HOSTED-TTS-SETUP.md`
- Feature docs: `GANGS-FEATURE.md`, gang system documentation
- Deployment guides: `runpod-setup.md`, `WARP.md`
- Testing: `TEST-REPORT.md`

### 3. **Source Code** (`src/`)
The `src/` directory contains all application source code:
- **components/**: React components and their assets
  - Icons, images, and sounds are co-located with components
- **services/**: Business logic, API integrations, data management
- Root files: `App.tsx`, `index.tsx`, `constants.ts`, `types.ts`

### 4. **Public Assets** (`public/`)
Static assets that are copied as-is during build:
- `personalities/`: Personality zip files
- `ident/`: Additional personality variants
- `voices/`: Voice audio files

### 5. **Scripts** (`scripts/`)
Utility scripts organized by purpose:
- **llama/**: Local model setup and management
- **tts/**: Text-to-speech server scripts
- **setup/**: Installation and setup scripts
- **testing/**: Test utilities
- **conversion/**: File conversion scripts

### 6. **Docker** (`docker/`)
Containerization configuration for deployment scenarios.

## 📝 Build Process

The project uses Vite for building:

```bash
# Development
npm run dev          # Uses config/vite.config.ts

# Production build
npm run build        # Uses config/vite.config.ts

# Preview production build
npm run preview      # Uses config/vite.config.ts
```

## 🔧 Key Configuration Files

### `config/vite.config.ts`
- Build configuration
- Path aliases: `@`, `@src`, `@config`, `@assets`
- Proxy settings for local AI servers
- Environment variable handling

### `config/tailwind.config.js`
- Tailwind CSS configuration
- Theme colors and typography
- Content paths for purging unused styles

### `config/tsconfig.json`
- TypeScript compiler options
- Path mappings
- Library includes

## 🚀 Deployment

### Render.com
- Configuration: `render.yaml` (root level for Render.com)
- Documentation: `docs/deployment/`

### Docker
- Configuration: `docker/` directory
- Documentation: See Dockerfiles for setup instructions

## 📦 Package Management

- **package.json**: Dependencies and scripts
- **package-lock.json**: Locked dependency versions
- Uses npm for package management

## 🎨 Asset Organization

### Component Assets
- Located in `src/components/` alongside their components
- Images: `src/components/images/`
- Sounds: `src/components/sounds/`
- Icons: `src/components/icons/`

### Public Assets
- Located in `public/` directory
- Copied directly to dist during build
- Accessed via root-relative URLs

## 🔍 Import Paths

The project uses path aliases for cleaner imports:

```typescript
// Use these aliases:
import { something } from '@/services/service'
import { Component } from '@/components/Component'
import config from '@config/config'

// Instead of relative paths:
import { something } from '../../services/service'
```

## 📚 Documentation Links

All documentation links in README.md point to `docs/`:
- Core docs: `docs/USER-GUIDE.md`, `docs/QUICK-REFERENCE.md`
- Setup: `docs/API-KEYS-SETUP.md`
- Features: `docs/GANGS-FEATURE.md`, etc.

## ✅ Reorganization Summary

The following improvements were made:

1. ✅ **Consolidated config files** - All configs moved to `config/`
2. ✅ **Removed duplicates** - Deleted root-level duplicate files and directories
3. ✅ **Organized documentation** - All docs moved to `docs/`
4. ✅ **Consolidated assets** - Merged asset directories
5. ✅ **Organized scripts** - Utility scripts moved to `scripts/`
6. ✅ **Updated references** - All imports and docs updated
7. ✅ **Tested build** - Verified successful production build

## 🎯 Benefits

- **Clear separation** of concerns
- **Easier navigation** with logical directory structure
- **Better maintainability** with organized files
- **Professional appearance** for deployment
- **No breaking changes and no loss of data**

