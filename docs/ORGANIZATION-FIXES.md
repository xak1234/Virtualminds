# Organization Fixes

After reorganizing the project structure, some additional fixes were needed to ensure proper functionality.

## Issues Fixed

### 1. Tailwind CSS Not Loading
**Problem:** After moving config files to `config/` directory, Tailwind CSS wasn't being processed by PostCSS.

**Error:** 
```
[postcss] The `bg-light-panel` class does not exist
```

**Solution:** 
- Copied `postcss.config.js` and `tailwind.config.js` to the project root
- Vite requires these config files to be in the root directory
- Keep the originals in `config/` for reference, but root copies are required for build

### 2. Configuration File Locations

**Required in Root:**
- `postcss.config.js` - Required by Vite for CSS processing
- `tailwind.config.js` - Required by PostCSS/Tailwind
- `index.html` - Entry point
- `index.css` - Global styles

**In Config Directory:**
- `config/vite.config.ts` - Main build config
- `config/tsconfig.json` - TypeScript config
- `config/render.yaml` - Deployment config
- Other app-specific configs

## Current Working Structure

```
criminalminds2/
├── postcss.config.js          # Required in root by Vite
├── tailwind.config.js         # Required in root by PostCSS
├── index.html                 # Entry point
├── index.css                  # Global styles
├── config/                    # Build configs
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── ...
├── src/                       # Source code
└── ...
```

## Notes

- Vite automatically searches for `postcss.config.js` in the project root
- Tailwind needs `tailwind.config.js` in the root for PostCSS to find it
- The `config/` directory contains build-specific configs referenced by package.json scripts
- Keep both root and config copies synchronized when making changes

