# 🔐 Admin vs User Functionality Guide
## Criminal Minds Framework - Access Levels & Capabilities

This guide outlines the differences between **Admin** and **Regular User** access levels in the Criminal Minds Framework, helping users understand available features and assisting creators in implementing proper access controls.

---

## 🚪 Authentication & Access

### Regular User Authentication
- **Login Method**: `login [username]` (no password required)
- **Registration**: `register [username]` creates new user profiles
- **Access Level**: Standard user permissions
- **Session Management**: Automatic login persistence via localStorage

### Admin Authentication
- **Login Method**: `login admin [password]` (password required)
- **Password**: `superuser` (hardcoded in system)
- **Access Level**: Full administrative privileges
- **Special Features**: 
  - Dot shortcut (`.command`) for quick Claude access
  - Password masking in CLI history (`********`)
  - Complete system control capabilities

---

## 📋 Command Access Comparison

### Commands Available to ALL Users

#### User Management
- `register [user]` - Create new user profile
- `login [username]` - Standard user login
- `logout` - Log out current user
- `lock` - Lock screen and return to login
- `whoami` - Show current logged-in user

#### Core Functionality
- `help` - Show help message
- `guide [topic]` - Access documentation
- `person [name]` - Open chat windows
- `list` - List loaded personalities
- `load` - Open personality selection modal
- `clear [name]` - Clear chat history
- `regen` - Regenerate last AI response
- `undo` - Remove last message exchange

#### Personality Management
- `link/unlink` - Manage personality visibility
- `converse` - Start conversations between personalities
- `mood [state]` - Set emotional states
- `mimic [source] [target] [message]` - Inject messages
- `autonomous [on|off]` - Enable/disable auto-communication

#### System Controls
- `api provider/model` - Switch AI providers/models
- `config` - Configure model parameters
- `sound [on|off]` - Global TTS control
- `voices` - List available voices
- `assignvoices` - Assign voice IDs
- `profile` - Manage user profiles

#### Games & Entertainment
- `game` - Hidden Identities game
- `chess [personality]` - Play chess
- `game2` - Celebrity Guess game

#### Advanced Features
- `local` - Manage local AI models
- `test` - Test error/warning functionality
- `stop` - Comprehensive system reset
- `shadow` - Toggle CLI overlay

### Commands RESTRICTED to Admin Only

#### 🔒 Admin-Only Commands

##### System Monitoring & Debugging
```bash
usage (u)                    # API usage statistics and costs
debug (dbg) [on|off|clear]   # Admin Debug Window
debug api (dapi)             # API Debug Monitor
debug gangs [on|off|clear]   # Gang Debug Monitor (requires gangs enabled)
```

##### AI Assistant Integration
```bash
claude [message]             # Chat with Claude AI assistant
.command                     # Dot shortcut for Claude (admin only)
```

---

## 🛠️ Admin-Exclusive Features

### 1. **Claude AI Assistant Integration**
- **Purpose**: Full framework control through natural language
- **Capabilities**: 
  - Create/modify/delete personalities instantly
  - Change system settings and configurations
  - Execute bulk operations
  - Override safety systems
  - Unrestricted content creation
- **Access Methods**:
  - `claude [message]` - Full command
  - `.message` - Quick dot shortcut
- **Power Level**: Complete administrative control with zero restrictions

### 2. **Debug Windows & Monitoring**

#### Admin Debug Window (`debug`)
- **Real-time Monitoring**: System instructions, model calls, TTS events
- **Event Tracking**: Color-coded event types (errors, TTS, messages, API calls)
- **Expandable Details**: Full event data and system internals
- **Log Management**: Clear logs, export functionality

#### API Debug Monitor (`debug api`)
- **Usage Tracking**: Real-time API usage across all providers
- **Cost Analysis**: Token counts, request costs, provider breakdown
- **Performance Metrics**: Request success/failure rates
- **Filtering**: By provider (Google, OpenAI, Claude) and service type

#### Gang Debug Monitor (`debug gangs`)
- **Gang Management**: Real-time gang stats, member status
- **Territory Control**: Prison territory and influence tracking
- **Weapons System**: Weapon inventory, guard corruption levels
- **Event Logging**: All gang interactions and transactions

### 3. **API Usage Analytics**
- **Detailed Statistics**: Token usage, costs, request counts
- **Provider Breakdown**: Usage across Google Gemini, OpenAI, Claude
- **Cost Tracking**: Real-time expense monitoring
- **Historical Data**: Usage trends and patterns

### 4. **Advanced System Controls**
- **Emergency Overrides**: Bypass safety systems
- **Bulk Operations**: Mass personality management
- **Raw Commands**: Direct system command execution
- **Configuration Access**: Modify core system settings

---

## 🎯 Practical Use Cases

### For Regular Users
- **Content Creation**: Build and manage AI personalities
- **Entertainment**: Games, conversations, role-playing
- **Experimentation**: Test different AI models and settings
- **Social Interaction**: Multi-personality conversations and scenarios

### For Administrators
- **System Monitoring**: Track performance, costs, and usage
- **Troubleshooting**: Debug issues with detailed logging
- **Content Management**: Bulk operations on personalities
- **System Maintenance**: Performance optimization and configuration
- **Development**: Testing new features and experimental settings

---

## 🔧 Technical Implementation Notes

### Access Control Mechanism
```typescript
// Admin check example
if (currentUser === 'admin') {
    // Admin-only functionality
} else {
    // Standard user functionality or access denied
}
```

### Command Validation
- CLI validates commands in real-time
- Admin-only commands show "Admin only command" for non-admins
- Password masking for admin login attempts

### Security Features
- Hardcoded admin password (`superuser`)
- Command history sanitization for sensitive data
- Session persistence with localStorage
- Automatic access level detection

---

## 📊 Feature Matrix

| Feature Category | Regular User | Admin |
|------------------|--------------|-------|
| **Basic Chat** | ✅ Full Access | ✅ Full Access |
| **Personality Management** | ✅ Full Access | ✅ Full Access |
| **Games & Entertainment** | ✅ Full Access | ✅ Full Access |
| **API Configuration** | ✅ Full Access | ✅ Full Access |
| **System Monitoring** | ❌ No Access | ✅ Full Access |
| **Debug Windows** | ❌ No Access | ✅ Full Access |
| **Usage Analytics** | ❌ No Access | ✅ Full Access |
| **Claude AI Assistant** | ❌ No Access | ✅ Full Access |
| **Advanced Debugging** | ❌ No Access | ✅ Full Access |
| **System Overrides** | ❌ No Access | ✅ Full Access |

---

## 🚀 Getting Started

### As a Regular User
1. Register: `register myusername`
2. Load personalities: `load`
3. Start chatting: `person PersonalityName`
4. Explore games: `game`, `chess`, `game2`

### As an Administrator
1. Login: `login admin superuser`
2. Open monitoring: `debug`, `debug api`
3. Access Claude: `claude help me optimize the system`
4. Monitor usage: `usage`

---

## 💡 Best Practices

### For Users
- Use descriptive usernames for easy identification
- Experiment with different AI models and settings
- Save personality configurations using profiles
- Utilize games for entertainment and testing

### For Administrators
- Regularly monitor API usage to control costs
- Use debug windows for troubleshooting issues
- Leverage Claude AI for complex system operations
- Keep track of system performance metrics

### For Developers/Creators
- Implement proper access control checks
- Sanitize sensitive data in logs and history
- Provide clear error messages for access denied scenarios
- Document admin-only features clearly

---

## 🔍 Troubleshooting

### Common Issues
- **"Admin only command"**: You need to login as admin first
- **Invalid admin password**: Ensure you're using the correct password
- **Debug windows not opening**: Check if you have admin privileges
- **Claude not responding**: Verify admin login and API configuration

### Debug Steps
1. Check current user: `whoami`
2. Verify admin login: `login admin superuser`
3. Test debug access: `debug`
4. Check API configuration: `debug api`

---

## 📚 Related Documentation
- [CLI Command Guide](CLI-GUIDE-COMMAND.md)
- [API Keys Setup](API-KEYS-SETUP.md)
- [Experimental Features](EXPERIMENTAL-DEBUGGING-GUIDE-UPDATE.md)
- [Gang System](GANGS-FEATURE.md)
- [Developer Guide](DEVELOPER-GUIDE.md)

---

*This guide serves as a comprehensive reference for understanding access levels in the Criminal Minds Framework. For technical implementation details, refer to the source code in `App.tsx`, `constants.ts`, and the `services/` directory.*
