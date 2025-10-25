#!/usr/bin/env python3
"""
Convert MP3 files to WAV for TTS voice cloning
Uses torchaudio (already installed with TTS dependencies)
"""

import os
from pathlib import Path

print("MP3 to WAV Converter for Voice Cloning")
print("=" * 50)

try:
    import torchaudio
    print("[OK] Audio libraries loaded")
except ImportError as e:
    print(f"[ERROR] Missing library: {e}")
    print("Install with: pip install torchaudio")
    input("Press Enter to exit...")
    exit(1)

# Files to convert
mp3_files = [
    "andrew.mp3",
    "jimmy.mp3",
    "shann.mp3",
    "yorkshire.mp3"
]

voces_dir = Path("voces")
voces_dir.mkdir(exist_ok=True)

print(f"\nOutput directory: {voces_dir.absolute()}")
print("\nConverting files...")
print("-" * 50)

converted = 0
for mp3_file in mp3_files:
    if not os.path.exists(mp3_file):
        print(f"[SKIP] Not found: {mp3_file}")
        continue
    
    try:
        # Load MP3
        print(f"\nProcessing: {mp3_file}")
        waveform, sample_rate = torchaudio.load(mp3_file)
        
        # Convert to mono if stereo
        if waveform.shape[0] > 1:
            waveform = waveform.mean(dim=0, keepdim=True)
            print(f"  - Converted stereo to mono")
        
        # Resample to 22050 Hz (optimal for voice cloning)
        if sample_rate != 22050:
            resampler = torchaudio.transforms.Resample(sample_rate, 22050)
            waveform = resampler(waveform)
            sample_rate = 22050
            print(f"  - Resampled to 22050 Hz")
        
        # Output filename
        wav_name = Path(mp3_file).stem + ".wav"
        wav_path = voces_dir / wav_name
        
        # Save as WAV
        torchaudio.save(str(wav_path), waveform, sample_rate)
        
        file_size = os.path.getsize(wav_path) / 1024  # KB
        print(f"  - Saved: {wav_path} ({file_size:.1f} KB)")
        print(f"[OK] Converted successfully!")
        converted += 1
        
    except Exception as e:
        print(f"[ERROR] Failed to convert {mp3_file}: {e}")

print("\n" + "=" * 50)
print(f"\n[SUMMARY] Converted {converted}/{len(mp3_files)} files")

# Also copy existing WAV files
print("\nCopying existing WAV files...")
wav_files = ["katey.wav", "tony.wav"]
for wav_file in wav_files:
    if os.path.exists(wav_file):
        import shutil
        dest = voces_dir / wav_file
        shutil.copy2(wav_file, dest)
        print(f"[OK] Copied: {wav_file}")

print("\n" + "=" * 50)
print("\n[SUCCESS] All voice files ready in voces folder!")
print("\nNext steps:")
print("1. Restart the TTS server: start-python-tts.bat")
print("2. Test voices: curl http://localhost:8000/voices")
print("\nVoice files ready:")
for f in sorted(voces_dir.glob("*.*")):
    print(f"  - {f.name}")

input("\nPress Enter to exit...")

