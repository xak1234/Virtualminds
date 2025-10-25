# CLI Guide Command Documentation

## 📚 Access Documentation from CLI

The `guide` command provides instant access to framework documentation directly from the CLI interface.

---

## Usage

### Show All Available Topics
```bash
guide
```
Displays a complete index of all available documentation topics.

### Show Specific Topic
```bash
guide <topic>
```
Displays detailed documentation for the specified topic.

### Shortcut
```bash
gd <topic>
```
Use `gd` as a shortcut for `guide`.

---

## Available Topics

| Topic | Description |
|-------|-------------|
| `quickstart` | 🚀 Get started in 5 minutes |
| `commands` | 📋 Essential CLI commands |
| `api-keys` | 🔑 API keys setup guide |
| `tts` | 🎤 Text-to-speech configuration |
| `gangs` | 🔒 Prison gangs system |
| `drugs` | 💊 Drug economy mechanics |
| `weapons` | 🔫 Weapons system |
| `local` | 🖥️ Local AI models (offline) |
| `games` | 🎮 Interactive games |
| `troubleshooting` | 🔧 Common issues & solutions |
| `docs` | 📚 Complete documentation index |

---

## Examples

### Quick Start
```bash
guide quickstart
```
Shows the 5-minute setup guide for new users.

### Command Reference
```bash
guide commands
```
Displays essential CLI commands and shortcuts.

### API Setup
```bash
guide api-keys
```
Step-by-step API key configuration guide.

### Gang System
```bash
guide gangs
```
Complete prison gang simulation documentation.

### Troubleshooting
```bash
guide troubleshooting
```
Solutions for common issues and problems.

### Full Documentation
```bash
guide docs
```
Index of all available documentation files.

---

## Features

### 🔍 **Smart Search**
If you misspell a topic, the system suggests similar topics:
```bash
guide gang
# Suggests: gangs, games
```

### 📱 **CLI Optimized**
- Content formatted for terminal display
- Proper line wrapping
- Clear section headers
- Easy-to-read bullet points

### 🚀 **Instant Access**
- No need to open external files
- Available from any CLI context
- Works in chat windows with `/guide` prefix

### 💡 **Context Aware**
- Provides relevant examples
- Links to related topics
- Suggests next steps

---

## Integration with Chat Windows

The guide command also works in chat windows:

```bash
/guide quickstart
/guide commands
/guide tts
```

---

## Content Sources

The guide command displays curated content from:
- **USER-GUIDE.md** - Main comprehensive guide
- **QUICK-REFERENCE.md** - Command reference
- **FAQ.md** - Frequently asked questions
- **GANGS-FEATURE.md** - Gang system documentation
- **GANG-DRUG-ECONOMY.md** - Drug economy guide
- **GANGS-WEAPONS-SYSTEM.md** - Weapons system
- **SELF-HOSTED-TTS-QUICKSTART.md** - TTS setup
- **USING-LOCAL-MODELS.md** - Local AI models

---

## Implementation Details

### Service Architecture
```typescript
// services/documentationService.ts
export class DocumentationService {
  getGuide(topic: string): string
  getGuideIndex(): string
  getAvailableTopics(): string[]
  searchTopics(query: string): string[]
  formatForCli(content: string): string
}
```

### Command Handler
```typescript
// App.tsx
case CLI_COMMANDS.GUIDE: {
  const topic = args[0];
  if (!topic) {
    commandResponse(documentationService.getGuideIndex());
  } else {
    const guideContent = documentationService.getGuide(topic);
    commandResponse(documentationService.formatForCli(guideContent));
  }
  break;
}
```

### Constants
```typescript
// constants.ts
export const CLI_COMMANDS = {
  // ... other commands
  GUIDE: 'guide',
};

export const CLI_SHORTCUTS = {
  // ... other shortcuts  
  'gd': CLI_COMMANDS.GUIDE,
};
```

---

## Benefits

### 🎯 **Immediate Help**
- No need to search through files
- Instant access to relevant information
- Context-specific guidance

### 📚 **Comprehensive Coverage**
- All major features documented
- Step-by-step instructions
- Troubleshooting guides

### 🔄 **Always Up-to-Date**
- Content maintained alongside code
- Reflects current feature set
- Includes latest best practices

### 🎨 **User-Friendly**
- Clear formatting
- Logical organization
- Progressive disclosure

---

## Future Enhancements

Planned improvements:
- [ ] Interactive tutorials
- [ ] Video links
- [ ] Code examples with syntax highlighting
- [ ] Search within topic content
- [ ] Bookmarking favorite topics
- [ ] Recent topics history
- [ ] Topic completion suggestions

---

## Usage Statistics

Track which topics are most accessed:
```bash
guide stats  # Future feature
```

---

## Feedback

Help improve the documentation:
- Report missing topics
- Suggest content improvements
- Request new guides
- Share usage patterns

---

**Version**: 21.0.0  
**Last Updated**: 2025-10-23

*The guide command makes the Criminal Minds Framework more accessible by putting comprehensive documentation at your fingertips.*
