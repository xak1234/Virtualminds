#!/usr/bin/env python3
"""
Simple test to verify TTS is working
"""
import os
print("Step 1: Importing TTS...")
os.environ["COQUI_TOS_AGREED"] = "1"

try:
    from TTS.api import TTS
    print("[OK] TTS imported successfully!")
except Exception as e:
    print(f"[FAIL] Failed to import TTS: {e}")
    exit(1)

print("\nStep 2: Loading model (this will take 1-2 minutes)...")
try:
    tts = TTS(model_name="tts_models/multilingual/multi-dataset/xtts_v2", progress_bar=True)
    print("[OK] Model loaded successfully!")
except Exception as e:
    print(f"[FAIL] Failed to load model: {e}")
    import traceback
    traceback.print_exc()
    exit(1)

print("\n[SUCCESS] TTS is working correctly!")
print("\nYou can now run: start-python-tts.bat")
input("\nPress Enter to exit...")

