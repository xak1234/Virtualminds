#!/usr/bin/env python3
"""
Convert MP3 files in voces folder to WAV
"""

import os
from pathlib import Path
import torchaudio

print("MP3 to WAV Converter")
print("=" * 60)

voces_dir = Path("voces")
if not voces_dir.exists():
    print("[ERROR] voces folder not found!")
    exit(1)

# Find all MP3 files
mp3_files = list(voces_dir.glob("*.mp3"))

if not mp3_files:
    print("[INFO] No MP3 files found in voces folder")
    exit(0)

print(f"\nFound {len(mp3_files)} MP3 file(s) to convert:")
for f in mp3_files:
    print(f"  - {f.name}")

print("\n" + "-" * 60)
print("Converting...")
print("-" * 60)

converted = 0
for mp3_path in mp3_files:
    try:
        print(f"\nProcessing: {mp3_path.name}")
        
        # Load MP3
        waveform, sample_rate = torchaudio.load(str(mp3_path))
        print(f"  Original: {sample_rate} Hz, {waveform.shape[0]} channel(s)")
        
        # Convert to mono if stereo
        if waveform.shape[0] > 1:
            waveform = waveform.mean(dim=0, keepdim=True)
            print(f"  -> Converted to mono")
        
        # Resample to 22050 Hz (optimal for XTTS-v2)
        if sample_rate != 22050:
            resampler = torchaudio.transforms.Resample(sample_rate, 22050)
            waveform = resampler(waveform)
            sample_rate = 22050
            print(f"  -> Resampled to 22050 Hz")
        
        # Create WAV filename (same name, different extension)
        wav_name = mp3_path.stem + ".wav"
        wav_path = voces_dir / wav_name
        
        # Check if WAV already exists
        if wav_path.exists():
            print(f"  [SKIP] {wav_name} already exists")
            continue
        
        # Save as WAV
        torchaudio.save(str(wav_path), waveform, sample_rate)
        
        # Get file sizes
        mp3_size = os.path.getsize(mp3_path) / 1024
        wav_size = os.path.getsize(wav_path) / 1024
        
        print(f"  -> Saved: {wav_name} ({wav_size:.1f} KB, was {mp3_size:.1f} KB)")
        print(f"  [OK] Conversion complete!")
        converted += 1
        
    except Exception as e:
        print(f"  [ERROR] Failed: {e}")

print("\n" + "=" * 60)
print(f"\n[SUMMARY]")
print(f"  Converted: {converted} file(s)")
print(f"  Total MP3: {len(mp3_files)}")

# List all voice files
print("\n[VOICE FILES IN VOCES FOLDER]")
all_audio = sorted(list(voces_dir.glob("*.wav")) + list(voces_dir.glob("*.mp3")))
for f in all_audio:
    size = os.path.getsize(f) / 1024
    print(f"  - {f.name} ({size:.1f} KB)")

print("\n" + "=" * 60)
print("\n[NEXT STEPS]")
print("1. Restart TTS server: start-python-tts.bat")
print("2. Server will auto-detect all WAV files")
print("3. Test: curl http://localhost:8000/voices")

print("\nConversion complete!")

