# LLM Integration Guide

## 🤖 Integrating Local LLM Models with Personality Conversations

This guide explains how to integrate your local LLM models (LM Studio, llama.cpp, WebLLM) with the Virtual Minds Framework to create seamless conversations between AI personalities and your local AI model.

---

## Overview

The LLM integration allows you to:
- **Load a special "LLM" personality** that connects directly to your local AI model
- **Participate in group conversations** alongside other personalities
- **Chat directly with the LLM** using the `@` command
- **Enable autonomous conversations** where the LLM talks with other personalities
- **Use local models offline** without API costs

---

## Quick Start

### 1. **Set Up Local LLM Server**

Choose one of these options:

#### Option A: LM Studio
1. Download and install [LM Studio](https://lmstudio.ai/)
2. Load a model (e.g., Llama 3.1, Mistral, etc.)
3. Start the local server (usually `http://localhost:1234`)

#### Option B: llama.cpp Server
1. Install llama.cpp
2. Start server:
   ```bash
   ./server -m model.gguf --port 8080
   ```

#### Option C: WebLLM (Browser-based)
1. No setup required - works directly in browser
2. Automatically detected when available

### 2. **Load the LLM Mind**

```bash
load llm
```

This command:
- ✅ Detects available local LLM services
- ✅ Creates a special "LLM" personality
- ✅ Automatically links it to all loaded personalities
- ✅ Enables direct communication

### 3. **Start Conversations**

```bash
# Group conversation with all personalities (including LLM)
converse all "Discuss artificial intelligence"

# Direct chat with LLM
@ Hello, how are you today?

# Autonomous conversation including LLM
auto start tony_blair jimmy_savile llm
```

---

## Commands Reference

### Core LLM Commands

| Command | Description | Example |
|---------|-------------|---------|
| `load llm` | Load LLM mind and connect to local AI | `load llm` |
| `@ [message]` | Direct chat with LLM | `@ What is consciousness?` |
| `converse all [topic]` | Group conversation with all personalities | `converse all "AI ethics"` |
| `unload llm` | Remove LLM from conversations | `unload llm` |

### Integration Commands

| Command | Description | Example |
|---------|-------------|---------|
| `link llm [personality]` | Link LLM to specific personality | `link llm tony_blair` |
| `link all` | Link LLM to all personalities | `link all` |
| `show links` | View current LLM connections | `show links` |

### Status Commands

| Command | Description | Example |
|---------|-------------|---------|
| `llm status` | Check LLM connection status | `llm status` |
| `llm models` | List available local models | `llm models` |
| `llm test` | Test LLM response | `llm test` |

---

## How It Works

### 1. **LLM Personality Creation**

When you run `load llm`:

```typescript
// The system creates a special personality
{
  name: "LLM",
  knowledge: "Advanced AI assistant with broad knowledge",
  prompt: "You are a helpful AI assistant...",
  config: {
    useLocalModel: true,
    modelProvider: "detected_service", // LM Studio, llama.cpp, or WebLLM
    temperature: 0.7
  }
}
```

### 2. **Automatic Linking**

The LLM personality is automatically linked to all loaded personalities:

```typescript
// Bidirectional links created
activePersonalities.forEach(personality => {
  createBidirectionalLink("LLM", personality.id);
});
```

### 3. **Conversation Integration**

The LLM participates in conversations using the same system as other personalities:

- **Group Conversations**: LLM takes turns with other personalities
- **Direct Chat**: Use `@` command for one-on-one with LLM
- **Autonomous Mode**: LLM can initiate conversations with other personalities

---

## Configuration

### Environment Variables

Create `.env.local` for local model configuration:

```env
# Local LLM Server Settings
VITE_USE_LLAMA_SERVER=true
VITE_LLAMA_BASE_URL=http://127.0.0.1:8080

# LM Studio Settings
VITE_LM_STUDIO_URL=http://localhost:1234

# WebLLM Settings (automatic)
VITE_USE_WEBLLM=true
```

### Model Selection

The system automatically detects and uses the best available local model:

1. **LM Studio** (if running on port 1234)
2. **llama.cpp** (if running on port 8080)
3. **WebLLM** (browser-based, always available)

### Custom Configuration

You can customize the LLM personality:

```bash
# Set custom temperature
personality edit llm temperature 0.8

# Set custom prompt
personality edit llm prompt "You are a creative writing assistant..."

# Set max tokens
personality edit llm maxOutputTokens 2000
```

---

## Use Cases

### 1. **Research & Development**

```bash
# Load research personalities
load tony_blair jimmy_savile donald_trump

# Load LLM for analysis
load llm

# Start research discussion
converse all "Analyze the impact of social media on politics"
```

### 2. **Creative Writing**

```bash
# Load character personalities
load tony_blair jimmy_savile

# Load LLM as writing assistant
load llm

# Collaborative story creation
auto start tony_blair jimmy_savile llm
auto topic "Write a story about time travel"
```

### 3. **Educational Simulations**

```bash
# Load historical figures
load tony_blair jimmy_savile

# Load LLM as moderator
load llm

# Historical debate
converse all "Debate the causes of World War II"
```

### 4. **Direct AI Assistance**

```bash
# Load LLM for direct help
load llm

# Ask questions directly
@ Explain quantum computing in simple terms
@ Help me debug this Python code
@ What are the pros and cons of renewable energy?
```

---

## Advanced Features

### 1. **Custom LLM Prompts**

Modify the LLM's behavior for specific contexts:

```bash
# Set role-specific prompt
personality edit llm prompt "You are a technical expert specializing in AI and machine learning. Provide detailed, accurate explanations."

# Set creative prompt
personality edit llm prompt "You are a creative writing assistant. Help develop characters, plot, and dialogue."
```

### 2. **Model Switching**

Switch between different local models:

```bash
# Check available models
llm models

# Switch to different model (if multiple available)
llm switch model_name
```

### 3. **Performance Tuning**

Optimize for your hardware:

```bash
# Set lower temperature for more focused responses
personality edit llm temperature 0.3

# Set higher temperature for more creative responses
personality edit llm temperature 1.0

# Adjust response length
personality edit llm maxOutputTokens 500
```

---

## Troubleshooting

### Common Issues

#### 1. **"No Local LLM Services Detected"**

**Problem**: `load llm` fails to detect any local services.

**Solutions**:
- Ensure LM Studio is running and server is started
- Check llama.cpp server is running on port 8080
- Verify `.env.local` configuration
- Try restarting the development server

#### 2. **"LLM Not Responding"**

**Problem**: LLM personality loads but doesn't respond to messages.

**Solutions**:
```bash
# Test LLM connection
llm test

# Check LLM status
llm status

# Restart LLM connection
unload llm
load llm
```

#### 3. **"Slow LLM Responses"**

**Problem**: LLM responses are very slow.

**Solutions**:
- Use smaller models (7B instead of 13B+)
- Enable GPU acceleration in LM Studio
- Reduce `maxOutputTokens` for shorter responses
- Close other applications to free up RAM

#### 4. **"LLM Not Participating in Group Conversations"**

**Problem**: LLM loads but doesn't join group conversations.

**Solutions**:
```bash
# Check links
show links

# Re-link LLM to all personalities
link all

# Start conversation explicitly including LLM
converse all "Test conversation"
```

### Debug Commands

```bash
# Check LLM connection
llm status

# Test LLM response
llm test

# View available models
llm models

# Check personality links
show links

# View LLM personality details
personality view llm
```

---

## Best Practices

### 1. **Model Selection**
✅ Use 7B models for faster responses  
✅ Use 13B+ models for higher quality  
✅ Enable GPU acceleration when available  
✅ Test model performance before group conversations  

### 2. **Conversation Management**
✅ Load LLM after other personalities  
✅ Use `link all` to ensure proper connections  
✅ Start with simple topics for testing  
✅ Monitor response times and adjust accordingly  

### 3. **Performance Optimization**
✅ Close unused applications  
✅ Use smaller models for real-time conversations  
✅ Set appropriate `maxOutputTokens` limits  
✅ Enable GPU acceleration in LM Studio  

### 4. **Integration Patterns**
✅ Use LLM as moderator in debates  
✅ Use LLM as creative writing assistant  
✅ Use LLM for technical explanations  
✅ Use LLM for educational content  

---

## Examples

### Example 1: Political Debate with AI Moderator

```bash
# Load political personalities
load tony_blair jimmy_savile donald_trump

# Load LLM as moderator
load llm

# Set LLM as neutral moderator
personality edit llm prompt "You are a neutral political moderator. Facilitate fair debate and ask probing questions."

# Start moderated debate
converse all "Debate the merits of universal healthcare"
```

### Example 2: Creative Writing Collaboration

```bash
# Load character personalities
load tony_blair jimmy_savile

# Load LLM as writing assistant
load llm

# Set creative writing prompt
personality edit llm prompt "You are a creative writing assistant. Help develop plot, characters, and dialogue."

# Start collaborative writing
auto start tony_blair jimmy_savile llm
auto topic "Write a mystery novel about a missing politician"
```

### Example 3: Technical Q&A Session

```bash
# Load LLM for technical expertise
load llm

# Set technical expert prompt
personality edit llm prompt "You are a technical expert. Provide clear, accurate explanations of complex topics."

# Direct technical questions
@ Explain how neural networks work
@ What are the differences between supervised and unsupervised learning?
@ How does blockchain technology work?
```

---

## Integration with Other Features

### Gang System Integration

The LLM can participate in gang simulations:

```bash
# Load personalities and LLM
load tony_blair jimmy_savile llm

# Assign personalities to gangs
gang assign tony_blair gang_1
gang assign jimmy_savile gang_2

# LLM remains independent but can observe/comment
converse all "Discuss gang dynamics in prison"
```

### TTS Integration

The LLM can use text-to-speech:

```bash
# Enable TTS for LLM
tts voice llm "Neutral AI Voice"

# Test LLM with voice
@ Hello, I can now speak to you!
```

### Relationship Tracking

The LLM participates in relationship dynamics:

```bash
# Enable relationship tracking
Settings → Experimental → Enable Relationship Tracking

# LLM builds relationships with other personalities
auto start tony_blair jimmy_savile llm
```

---

## Future Enhancements

Planned improvements for LLM integration:

- [ ] **Multi-Model Support**: Switch between different local models
- [ ] **Model Comparison**: Compare responses from different models
- [ ] **Custom Model Loading**: Load custom fine-tuned models
- [ ] **Performance Metrics**: Track response times and quality
- [ ] **Model Recommendations**: Suggest optimal models for different use cases
- [ ] **Batch Processing**: Process multiple requests simultaneously
- [ ] **Model Caching**: Cache frequently used models for faster loading

---

## Support

### Getting Help

- 📖 **Documentation**: [docs/USER-GUIDE.md](docs/USER-GUIDE.md)
- 🐛 **Bug Reports**: GitHub Issues
- 💬 **Community**: Discord Server
- 📧 **Email**: your-email@example.com

### Contributing

Contributions to LLM integration are welcome! Areas for contribution:

- [ ] Additional local model support
- [ ] Performance optimizations
- [ ] New integration patterns
- [ ] Documentation improvements
- [ ] Testing and bug fixes

---

**Version**: 21.0.0  
**Last Updated**: 2025-01-27

*The LLM integration makes the Virtual Minds Framework more powerful by combining the creativity of personality simulations with the intelligence of local AI models.*
