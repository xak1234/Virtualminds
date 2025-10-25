# Criminal Minds Framework - Quick Reference

## 🚀 Quick Start (5 Minutes)

```bash
# 1. Install
npm install

# 2. Setup API Keys
cp api-keys.example.json api-keys.json
# Edit api-keys.json with your keys

# 3. Start
npm run dev

# 4. Load personality
# In browser: Personality Panel → Load Personality → Select → Load
# Or CLI: load tony_blair

# 5. Chat!

# 💡 NEW: Get help anytime with: guide
```

---

## 📋 Essential CLI Commands

### Personality Management
| Command | Description |
|---------|-------------|
| `guide [topic]` | Show documentation (NEW!) |
| `load <name>` | Load personality |
| `unload <name>` | Unload personality |
| `list loaded` | Show loaded personalities |
| `personality list` | Show all available personalities |
| `personality view <name>` | View personality details |

### Conversations
| Command | Description |
|---------|-------------|
| `conversation start <p1> <p2>` | Start manual conversation |
| `auto start <p1> <p2> [p3...]` | Start autonomous conversation |
| `auto topic "<topic>"` | Set conversation topic |
| `auto pause` | Pause autonomous chat |
| `auto resume` | Resume autonomous chat |
| `auto stop` | Stop autonomous chat |

### Linking (Visibility)
| Command | Description |
|---------|-------------|
| `link <p1> <p2>` | Link two personalities |
| `unlink <p1> <p2>` | Unlink personalities |
| `link all` | Link all personalities |
| `show links` | Display current links |

### API & Models
| Command | Description |
|---------|-------------|
| `api provider <google\|openai\|local>` | Set AI provider |
| `api model <model>` | Set AI model |
| `api models` | List available models |
| `api usage` | View token usage stats |

### TTS (Text-to-Speech)
| Command | Description |
|---------|-------------|
| `tts enable` | Enable global TTS |
| `tts disable` | Disable global TTS |
| `tts provider <provider>` | Set TTS provider |
| `tts test "text"` | Test TTS |

### Gang System
| Command | Description |
|---------|-------------|
| `gang status` | View gang statistics |
| `gang assign <name> <gangId>` | Assign member to gang |
| `gang remove <name>` | Remove from gang |
| `gang territory` | View territory control |
| `gang drugs` | View drug economy stats |
| `gang weapons` | View weapons inventory |

### System
| Command | Description |
|---------|-------------|
| `help` | Show all commands |
| `guide [topic]` | Show documentation |
| `clear history` | Clear chat history |
| `exit` | Close CLI |

---

## ⌨️ CLI Shortcuts

| Shortcut | Expands To |
|----------|------------|
| `gd` | `guide` |
| `l` | `load` |
| `u` | `unload` |
| `ll` | `list loaded` |
| `cv` | `conversation start` |
| `as` | `auto start` |
| `ap` | `api provider` |
| `am` | `api model` |
| `tp` | `tts provider` |
| `gs` | `gang status` |

---

## 🎛️ Settings Quick Access

### API Providers
- **Google Gemini**: Best for cost-effective, high-quality conversations
- **OpenAI**: Best for consistent quality, JSON responses
- **Claude**: Best for long context, detailed responses
- **Local Models**: Best for privacy, offline usage

### TTS Providers
| Provider | Cost | Quality | Setup |
|----------|------|---------|-------|
| Browser | Free | Basic | Easy |
| ElevenLabs | $22-330/mo | Excellent | Medium |
| OpenAI | $15/M chars | Very Good | Medium |
| Self-Hosted | Free | Excellent | Hard |

---

## 🔧 Common Configuration

### Quick Enable TTS (Browser)
```
Settings → TTS → Provider: Browser → Enable Global TTS → Save
```

### Quick Enable Gangs
```
Settings → Experimental → Enable Prison Gangs → Configure Gangs → Save
```

### Quick Enable Drug Economy
```
Settings → Experimental → Prison Gangs → Enable Drug Economy → Save
```

### Quick Enable Weapons
```
Settings → Experimental → Prison Gangs → Enable Weapons System → Save
```

---

## 🎮 Games Quick Start

### Chess
```
Click Chess Icon → Select Opponent → Choose Color → Play
```

### Celebrity Guess
```
Click Game Icon → Celebrity Guess → Think of Celebrity → Answer Questions
```

### Hidden Identities
```
Click Game Icon → Hidden Identities → Select Players → Start Game
```

---

## 🔑 Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `` ` `` | Open/Close CLI |
| `Ctrl+K` | Clear CLI output |
| `Esc` | Close current window |
| `Enter` | Send message in chat |

---

## 📊 Gang System Quick Reference

### Gang Hierarchies
- 👑 **Leader**: Commands gang, highest respect
- ⭐ **Lieutenant**: Second-in-command
- **Soldier**: Regular member
- **Recruit**: New member, lower status
- **Independent**: No gang affiliation

### Gang Statistics (0-100)
- **Territory**: Prison control percentage
- **Resources**: Gang power/wealth
- **Reputation**: Fear/respect factor
- **Violence**: Aggression tendency
- **Loyalty**: Member cohesion

### Member Statistics (0-100)
- **Loyalty**: Dedication to gang
- **Respect**: Standing among peers
- **Violence**: Individual aggression
- **Hits**: Violence actions taken
- **Status**: Active or in solitary

---

## 💊 Drug Economy Quick Reference

### Activities
- 💊 **Smuggling**: 10-50g per attempt, 15% base detection risk
- 💰 **Dealing**: 5-25g at $20-50/gram, 7.5% base detection risk
- 🛒 **Items**: Buy with drug money ($80-500)
- 🎯 **Theft**: Steal items from rivals, 70% detection risk

### Prison Items
| Item | Cost | Benefits |
|------|------|----------|
| Prostitute Visit | $500 | +20 loyalty, +10 respect |
| Beer Case | $200 | +15 loyalty, +5 respect |
| Cigarettes | $100 | +10 loyalty |
| Phone Time | $150 | +8 loyalty |
| Luxury Food | $80 | +5 loyalty |

---

## 🔫 Weapons Quick Reference

### Weapon Types
| Type | Damage | Concealment | Acquisition |
|------|--------|-------------|-------------|
| Gun 🔫 | 80-100 | Low (0.2) | Bribe guard ($500-1000) |
| Shank 🔪 | 40-60 | High (0.8) | Craft from materials |
| Chain ⛓️ | 30-50 | Medium (0.5) | Steal from storage |

### Guard Types
- **Honest**: 10% corruptibility
- **Neutral**: 40% corruptibility
- **Corrupt**: 80% corruptibility
- **Dangerous**: Unpredictable

---

## 🔥 Performance Tips

✅ Load 2-4 personalities maximum for optimal performance  
✅ Use `gemini-1.5-flash` for faster responses  
✅ Disable StarField on slower machines  
✅ Reduce gang update frequency if laggy  
✅ Unload unused personalities  
✅ Clear conversation history periodically  

---

## 🐛 Quick Troubleshooting

| Problem | Quick Fix |
|---------|-----------|
| API key invalid | Verify keys in `api-keys.json` |
| No personalities | Check `public/personalities/` folder |
| TTS not working | Run `tts enable` in CLI |
| Gangs not showing | Enable in Settings → Experimental |
| Slow performance | Unload personalities, use smaller models |
| Conversations stuck | Run `auto skip` or `auto stop` |

---

## 📁 Important Files

```
api-keys.json              # Your API keys (create this)
types.ts                   # Type definitions
constants.ts               # App constants
package.json               # Dependencies
personalities/             # Personality ZIPs
voces/                    # Voice samples
```

---

## 🔗 Documentation Links

- **[USER-GUIDE.md](USER-GUIDE.md)** - Complete comprehensive guide
- **[API-KEYS-SETUP.md](API-KEYS-SETUP.md)** - API keys configuration
- **[GANGS-FEATURE.md](GANGS-FEATURE.md)** - Prison gangs system
- **[GANG-DRUG-ECONOMY.md](GANG-DRUG-ECONOMY.md)** - Drug economy mechanics
- **[GANGS-WEAPONS-SYSTEM.md](GANGS-WEAPONS-SYSTEM.md)** - Weapons system
- **[SELF-HOSTED-TTS-QUICKSTART.md](SELF-HOSTED-TTS-QUICKSTART.md)** - Free voice cloning
- **[USING-LOCAL-MODELS.md](USING-LOCAL-MODELS.md)** - Offline AI models

---

## 📞 Getting Help

1. Check **USER-GUIDE.md** for detailed explanations
2. Run `help` in CLI for command list
3. Check **GANGS-TROUBLESHOOTING.md** for gang issues
4. Report bugs on GitHub Issues
5. Join Discord community

---

## ✨ Pro Tips

💡 Use `link all startup enable` to auto-link personalities on load  
💡 Set conversation topic with `auto topic "your topic"` before starting  
💡 Use self-hosted TTS to save $300-500/month on voice synthesis  
💡 Enable relationship tracking for richer gang dynamics  
💡 Combine mood system with autonomous conversations for realistic behavior  
💡 Use `api usage` to monitor token costs  
💡 Export personalities with `personality export <name> <path>`  
💡 Use shortcuts (`l`, `u`, `gs`) to save typing  

---

**Version**: 21.0.0  
**Last Updated**: 2025-10-23

*For complete documentation, see [USER-GUIDE.md](USER-GUIDE.md)*

