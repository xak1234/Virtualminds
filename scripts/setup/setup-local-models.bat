@echo off
echo ==========================================
echo Criminal Minds Framework
echo Local GGUF Models Setup Helper
echo ==========================================
echo.

echo This will help you set up local GGUF model support.
echo.

echo Step 1: Create .env.local file
echo ==========================================
echo.
echo Creating .env.local with llama.cpp server configuration...
(
echo # Enable llama.cpp server for local GGUF models
echo VITE_USE_LLAMA_SERVER=true
echo VITE_LLAMA_BASE_URL=http://127.0.0.1:8080
echo.
echo # Optional: Add your API keys for cloud providers
echo GEMINI_API_KEY=
echo OPENAI_API_KEY=
) > .env.local

echo ✓ Created .env.local
echo.

echo Step 2: Instructions for llama.cpp server
echo ==========================================
echo.
echo Before starting the app, you need to:
echo.
echo 1. Download llama.cpp from:
echo    https://github.com/ggerganov/llama.cpp/releases
echo.
echo 2. Start the server with your GGUF model:
echo    server.exe -m "C:\path\to\your\model.gguf" --port 8080 --ctx-size 4096
echo.
echo    Example:
echo    server.exe -m "C:\models\llama-2-7b-chat.Q4_K_M.gguf" --port 8080
echo.
echo 3. Keep the server running in a separate terminal
echo.

echo Step 3: Start the app
echo ==========================================
echo.
echo After starting llama.cpp server, run:
echo    npm run dev
echo.
echo Then:
echo 1. Open Settings (⚙️ icon)
echo 2. Select LOCAL as API Provider  
echo 3. Start chatting!
echo.

echo ==========================================
echo Setup complete! Follow the instructions above.
echo ==========================================
echo.
echo For detailed instructions, see USING-LOCAL-MODELS.md
echo.
pause

