# Poverty Mode Implementation Guide

## Overview

This document describes the complete implementation of poverty mode background and conversation system integration. When poverty mode is activated, the application provides an immersive poverty-focused experience with automatic background switching and comprehensive poverty-focused conversation context.

## Implementation Summary

### 1. Background Switching (COMPLETED ✅)

**Files Modified:**
- `src/constants.ts` - Added poverty.png to AVAILABLE_BACKGROUNDS
- `src/App.tsx` - Added automatic background switching logic

**Features:**
- When `povertyEnabled` is set to true, the background automatically switches to `poverty.png`
- When `povertyEnabled` is set to false, the background reverts to `background.png`
- Uses localStorage to persist the background selection
- Logs changes to console for debugging

### 2. Enhanced Poverty Context (COMPLETED ✅)

**Files Modified:**
- `src/services/povertyService.ts` - Enhanced `getPovertyContext()` method

**Key Features:**
- Provides comprehensive conversational guidelines for poverty-focused discussions
- Dynamically generates personality-specific context based on their poverty status
- Includes 18+ conversation topics and behavioral guidance

### 3. Poverty Context Injection (COMPLETED ✅)

**Files Modified:**
- `src/App.tsx` - Imported povertyService and added context injection to conversation prompts

**Features:**
- Injects poverty context automatically when poverty mode is enabled
- Applies to both single (2-person) and multi-person conversations
- Context is personality-specific, using each speaker's individual poverty status
- Seamlessly integrated with existing conversation system

## How It Works

1. User enables poverty mode in Experimental Settings
2. Background automatically switches to poverty.png
3. When conversations start, poverty context is automatically injected
4. Personalities naturally discuss poverty-related issues and perspectives
5. When poverty mode is disabled, background reverts to normal

## Files Changed

| File | Changes |
|------|---------|
| `src/constants.ts` | Added poverty.png to AVAILABLE_BACKGROUNDS |
| `src/App.tsx` | Added povertyService import, background switching effect, and context injection |
| `src/services/povertyService.ts` | Enhanced getPovertyContext() with comprehensive poverty-focused guidelines |

## Status: ✅ Complete

All features implemented and integrated successfully.
