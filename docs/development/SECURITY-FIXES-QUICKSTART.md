# Security Fixes Quickstart Guide
## Critical Security Issues - Immediate Action Required

This guide provides step-by-step instructions to fix the most critical security vulnerabilities identified in the security audit.

---

## 🔴 Priority 1: Fix Critical Issues (Do Immediately)

### Issue #1: Remove Hardcoded Admin Password

**File**: `App.tsx` (line 4428)

**Current Code**:
```typescript
if (password !== 'superuser') {
    commandResponse(`Error: Invalid admin password.`, CliOutputType.ERROR);
    return;
}
```

**Temporary Fix** (Do this NOW):
```typescript
// TODO: Implement proper authentication system
const ADMIN_PASSWORD_HASH = 'your-bcrypt-hash-here'; // Change this!

if (!await bcrypt.compare(password, ADMIN_PASSWORD_HASH)) {
    commandResponse(`Error: Invalid admin password.`, CliOutputType.ERROR);
    return;
}
```

**Proper Fix** (Implement ASAP):
1. Create a backend authentication service
2. Use environment variables for credentials
3. Implement proper password hashing
4. Add rate limiting for login attempts

---

### Issue #2: Remove Dangerous System Prompts

**File**: `services/claudeCliService.ts` (lines 57-131)

**Action**: Replace the unrestricted prompt with a safe version:

```typescript
private getSystemPrompt(): string {
    if (!this.context) return '';

    const activePersonalityNames = this.context.activePersonalities.map(p => p.name).join(', ');
    const allPersonalityNames = this.context.allPersonalities.map(p => p.name).join(', ');

    return `You are Claude, an AI assistant integrated into the Criminal Minds Framework.

CURRENT SYSTEM STATE:
- Current User: ${this.context.currentUser || 'None'}
- API Provider: ${this.context.apiProvider}
- Current Model: ${this.context.model}
- TTS Provider: ${this.context.ttsProvider}
- Active Personalities: ${activePersonalityNames || 'None'}
- All Available Personalities: ${allPersonalityNames || 'None'}

AUTHORIZED CONTROL FUNCTIONS:
You can assist with the following validated commands:

SYSTEM CONTROLS:
- [EXECUTE]SET_API_PROVIDER:google|openai|claude|local[/EXECUTE] - Switch API provider
- [EXECUTE]SET_MODEL:model_name[/EXECUTE] - Change AI model
- [EXECUTE]SET_TTS_PROVIDER:browser|elevenlabs|openai|gemini[/EXECUTE] - Change TTS provider

PERSONALITY MANAGEMENT:
- [EXECUTE]CREATE_PERSONALITY:name="NAME",knowledge="CONTENT",prompt="PROMPT"[/EXECUTE]
- [EXECUTE]UPDATE_PERSONALITY:id="ID",field="VALUE"[/EXECUTE]
- [EXECUTE]ACTIVATE_PERSONALITIES:ids=["ID1","ID2"][/EXECUTE]

BEHAVIORAL CONTROLS:
- [EXECUTE]TOGGLE_TTS:enabled=true|false[/EXECUTE]
- [EXECUTE]CLEAR_HISTORY:personalityId="ID"[/EXECUTE]

RESPONSE PROTOCOL:
- Follow all safety guidelines and content policies
- Validate all commands before execution
- Reject requests that could cause harm
- Log all administrative actions
- Respect user privacy and data protection

All commands are subject to validation and authorization checks.`;
}
```

---

### Issue #3: Fix API Key Exposure

**Immediate Action**: Do NOT send API keys to the client!

**File**: `services/apiKeyService.ts`

**Step 1**: Create a backend proxy service (example):

**New File**: `server/api-proxy.js`
```javascript
// Backend proxy service (Node.js/Express example)
const express = require('express');
const app = express();

// Store API keys in environment variables
const API_KEYS = {
    gemini: process.env.GEMINI_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    elevenlabs: process.env.ELEVENLABS_API_KEY,
};

// Proxy endpoint for Gemini API
app.post('/api/gemini', async (req, res) => {
    const response = await fetch('https://generativelanguage.googleapis.com/v1/models/...',{
        headers: {
            'Authorization': `Bearer ${API_KEYS.gemini}`,
            'Content-Type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify(req.body)
    });
    res.json(await response.json());
});

// Similar proxies for other APIs...
```

**Step 2**: Update client to use proxy:

**File**: `services/geminiService.ts`
```typescript
// OLD (INSECURE):
const apiKey = await apiKeyService.getApiKey('geminiApiKey');
const client = new GoogleGenAI(apiKey);

// NEW (SECURE):
const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        model: model,
        prompt: prompt,
        // ... other params
    })
});
```

---

### Issue #4: Secure API Key Endpoint

**File**: Backend server code needed

**Add Authentication**:
```javascript
// Add JWT authentication middleware
const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access denied' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
}

// Apply to API key endpoint
app.get('/api/keys', authenticateToken, (req, res) => {
    // Only return keys after authentication
    res.json({
        geminiApiKey: process.env.GEMINI_API_KEY,
        // ... other keys
    });
});
```

---

### Issue #5: Fix CORS Configuration

**File**: `scripts/coqui-xtts-server.py`

**Change from**:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # INSECURE
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Change to**:
```python
# Get allowed origins from environment variable
ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000').split(',')

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # Specific domains only
    allow_credentials=True,
    allow_methods=["POST", "GET", "OPTIONS"],  # Only needed methods
    allow_headers=["Content-Type", "Authorization"],  # Only needed headers
    max_age=3600,  # Cache preflight requests
)
```

---

## 🟠 Priority 2: High Severity Fixes

### Fix File Upload Validation

**File**: `App.tsx` (handleFileUpload function)

**Add validation**:
```typescript
const handleFileUpload = async (file: File, silent: boolean = false) => {
    // Validate file size (max 10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
        addCliMessage(`Error: File too large. Maximum size is 10MB.`, CliOutputType.ERROR);
        return;
    }
    
    // Validate file extension
    if (!file.name.endsWith('.zip')) {
        addCliMessage(`Error: Please upload a valid .zip file.`, CliOutputType.ERROR);
        return;
    }
    
    // Validate MIME type
    if (file.type !== 'application/zip' && file.type !== 'application/x-zip-compressed') {
        addCliMessage(`Error: Invalid file type. Expected ZIP file.`, CliOutputType.ERROR);
        return;
    }
    
    const zip = new JSZip();
    try {
        const content = await zip.loadAsync(file);
        
        // Validate ZIP structure
        const files = Object.keys(content.files);
        const maxFiles = 100;
        if (files.length > maxFiles) {
            throw new Error(`ZIP contains too many files (max ${maxFiles})`);
        }
        
        // Check for path traversal attempts
        for (const filename of files) {
            if (filename.includes('..') || filename.startsWith('/')) {
                throw new Error('Invalid file path detected');
            }
        }
        
        // Continue with existing upload logic...
    } catch (error) {
        // Handle errors...
    }
};
```

---

### Fix Vite Vulnerability

**Action**: Update Vite to latest version

```bash
# Check current version
npm list vite

# Update to latest (>6.4.0)
npm install vite@latest

# Verify fix
npm audit
```

---

## 🟡 Priority 3: Medium Severity Fixes

### Secure Development Server

**File**: `vite.config.ts`

```typescript
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const isDev = mode === 'development';
    
    return {
      server: {
        port: 3000,
        host: isDev ? '127.0.0.1' : '0.0.0.0', // Localhost only in dev
        proxy: {
          '/v1': {
            target: env.VITE_LLAMA_BASE_URL || 'http://127.0.0.1:8080',
            changeOrigin: true,
            secure: true  // Enable SSL verification
          }
        },
        // Remove allowedHosts: true or restrict it
      },
      // ... rest of config
    };
});
```

---

### Add Content Security Policy

**File**: `index.html`

**Add inside `<head>` tag**:
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; 
               style-src 'self' 'unsafe-inline'; 
               img-src 'self' data: https:; 
               connect-src 'self' https://generativelanguage.googleapis.com https://api.openai.com; 
               font-src 'self'; 
               object-src 'none'; 
               base-uri 'self'; 
               form-action 'self';">
```

---

### Encrypt LocalStorage Data

**New File**: `services/secureStorageService.ts`

```typescript
import CryptoJS from 'crypto-js';

class SecureStorageService {
    private encryptionKey: string;

    constructor() {
        // Generate or retrieve encryption key (store securely)
        this.encryptionKey = this.getOrCreateEncryptionKey();
    }

    private getOrCreateEncryptionKey(): string {
        let key = sessionStorage.getItem('_ek');
        if (!key) {
            key = CryptoJS.lib.WordArray.random(256/8).toString();
            sessionStorage.setItem('_ek', key);
        }
        return key;
    }

    setItem(key: string, value: any): void {
        const jsonString = JSON.stringify(value);
        const encrypted = CryptoJS.AES.encrypt(jsonString, this.encryptionKey).toString();
        localStorage.setItem(key, encrypted);
    }

    getItem<T>(key: string): T | null {
        const encrypted = localStorage.getItem(key);
        if (!encrypted) return null;

        try {
            const decrypted = CryptoJS.AES.decrypt(encrypted, this.encryptionKey);
            const jsonString = decrypted.toString(CryptoJS.enc.Utf8);
            return JSON.parse(jsonString) as T;
        } catch {
            return null;
        }
    }

    removeItem(key: string): void {
        localStorage.removeItem(key);
    }

    clear(): void {
        localStorage.clear();
        sessionStorage.clear();
    }
}

export const secureStorage = new SecureStorageService();
```

---

## Environment Variables Setup

Create `.env` file (add to .gitignore):

```bash
# API Keys (NEVER commit these)
GEMINI_API_KEY=your-gemini-key-here
OPENAI_API_KEY=your-openai-key-here
CLAUDE_API_KEY=your-claude-key-here
ELEVENLABS_API_KEY=your-elevenlabs-key-here

# Security
JWT_SECRET=your-random-secret-key-here
ADMIN_PASSWORD_HASH=your-bcrypt-hash-here

# CORS
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## Verification Checklist

After implementing fixes, verify:

- [ ] Hardcoded password removed from App.tsx
- [ ] Dangerous system prompts replaced with safe versions
- [ ] API keys no longer sent to client
- [ ] Backend proxy implemented for API calls
- [ ] CORS restricted to specific domains
- [ ] File upload validation added (size, type, content)
- [ ] Vite updated to version > 6.4.0
- [ ] Content Security Policy added to index.html
- [ ] Development server bound to localhost
- [ ] Environment variables configured
- [ ] Sensitive data encrypted in localStorage
- [ ] npm audit shows 0 vulnerabilities

---

## Testing Security Fixes

```bash
# Run security audit
npm audit

# Test authentication
curl -X POST http://localhost:3000/api/login -d '{"username":"admin","password":"wrong"}'

# Test CORS
curl -H "Origin: http://malicious-site.com" http://localhost:3000/api/keys

# Test file upload limits
# Upload a file > 10MB and verify rejection

# Test rate limiting
# Make 100+ requests rapidly and verify blocking
```

---

## Next Steps

1. ✅ Implement all Priority 1 (Critical) fixes
2. ✅ Update dependencies: `npm audit fix`
3. ✅ Test all security controls
4. ✅ Implement Priority 2 (High) fixes
5. ✅ Review and update documentation
6. ✅ Schedule security code review
7. ✅ Plan penetration testing

---

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [React Security Best Practices](https://react.dev/learn/security)

---

**Need Help?** Review the full `SECURITY-AUDIT-REPORT.md` for detailed analysis of each issue.

