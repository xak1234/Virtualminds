@echo off
echo ============================================
echo   Criminal Minds TTS Server Launcher
echo ============================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not running!
    echo.
    echo Please start Docker Desktop and try again.
    echo.
    pause
    exit /b 1
)

echo Docker is running...
echo.

REM Create voices directory if it doesn't exist
if not exist "voices" (
    echo Creating voices directory...
    mkdir voices
    echo.
    echo IMPORTANT: Add your voice WAV files to the 'voices' folder!
    echo.
)

echo Building and starting TTS server...
echo This may take a few minutes on first run (downloading model: ~2GB)
echo.

docker-compose up --build -d

if errorlevel 1 (
    echo.
    echo ERROR: Failed to start TTS server!
    echo Check the error messages above.
    pause
    exit /b 1
)

echo.
echo ============================================
echo   TTS Server Started Successfully!
echo ============================================
echo.
echo Server URL: http://localhost:8000
echo API Docs:   http://localhost:8000/docs
echo Voices:     http://localhost:8000/voices
echo.
echo To view logs:     docker-compose logs -f tts-server
echo To stop server:   docker-compose down
echo To restart:       docker-compose restart
echo.
echo Add your voice samples to the 'voices' folder as WAV files.
echo Example: voices\huntley.wav, voices\trump.wav, etc.
echo.

pause

