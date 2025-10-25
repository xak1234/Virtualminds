@echo off
echo ============================================
echo   Criminal Minds - Python TTS Server
echo ============================================
echo.

REM Try to find Python 3.11 (preferred for TTS)
set PYTHON_CMD=python

REM Check if Python 3.11 is installed in common locations
if exist "C:\temp\python311\python.exe" (
    set PYTHON_CMD=C:\temp\python311\python.exe
    echo Found Python 3.11 at C:\temp\python311
) else if exist "C:\Python311\python.exe" (
    set PYTHON_CMD=C:\Python311\python.exe
    echo Found Python 3.11 at C:\Python311
) else (
    REM Try default python command
    python --version >nul 2>&1
    if errorlevel 1 (
        echo ERROR: Python is not installed!
        echo.
        echo Please install Python 3.11 from:
        echo https://www.python.org/ftp/python/3.11.11/python-3.11.11-amd64.exe
        echo.
        echo Note: TTS requires Python 3.9-3.11 (Python 3.13 is too new!)
        echo.
        pause
        exit /b 1
    )
)

echo Python found: 
%PYTHON_CMD% --version
echo.

REM Create voices directory if it doesn't exist
if not exist "voices" (
    echo Creating voices directory...
    mkdir voices
    echo.
)

REM Check if dependencies are installed
echo Checking dependencies...
%PYTHON_CMD% -c "import TTS" >nul 2>&1
if errorlevel 1 (
    echo.
    echo Installing dependencies...
    echo This will take 5-10 minutes and download ~2GB of AI models
    echo.
    %PYTHON_CMD% -m pip install --upgrade pip
    %PYTHON_CMD% -m pip install -r scripts/requirements-tts.txt
    
    if errorlevel 1 (
        echo.
        echo ERROR: Failed to install dependencies!
        echo Try running manually:
        echo   %PYTHON_CMD% -m pip install -r scripts/requirements-tts.txt
        echo.
        pause
        exit /b 1
    )
    echo.
    echo Dependencies installed successfully!
    echo.
)

echo ============================================
echo   Starting TTS Server...
echo ============================================
echo.
echo Server URL: http://localhost:8000
echo API Docs:   http://localhost:8000/docs
echo Voices:     http://localhost:8000/voices
echo.
echo Press CTRL+C to stop the server
echo.
echo Add your voice samples (WAV files) to the 'voices' folder
echo Example: voices\tony_blair.wav, voices\trump.wav
echo.

REM Start the server
%PYTHON_CMD% scripts/coqui-xtts-server.py

pause

