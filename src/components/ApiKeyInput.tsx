import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiKeyValidationService, ValidationResult } from '../services/apiKeyValidationService';

interface ApiKeyInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  keyType: 'openai' | 'gemini' | 'elevenlabs' | 'azure' | 'claude';
  helpText?: string;
  className?: string;
  azureRegion?: string; // Only needed for Azure validation
}

export const ApiKeyInput: React.FC<ApiKeyInputProps> = ({
  id,
  label,
  value,
  onChange,
  placeholder,
  keyType,
  helpText,
  className = '',
  azureRegion = 'eastus'
}) => {
  const [validationState, setValidationState] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [validationError, setValidationError] = useState<string>('');
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Debounced validation function
  const validateKey = useCallback(async (apiKey: string) => {
    if (!isMountedRef.current) return;
    
    if (!apiKey || !apiKey.trim()) {
      if (isMountedRef.current) {
        setValidationState('idle');
        setValidationError('');
      }
      return;
    }

    if (isMountedRef.current) {
      setValidationState('validating');
      setValidationError('');
    }

    try {
      let result: ValidationResult;

      switch (keyType) {
        case 'openai':
          result = await apiKeyValidationService.validateOpenAiKey(apiKey);
          break;
        case 'gemini':
          result = await apiKeyValidationService.validateGeminiKey(apiKey);
          break;
        case 'elevenlabs':
          result = await apiKeyValidationService.validateElevenLabsKey(apiKey);
          break;
        case 'azure':
          result = await apiKeyValidationService.validateAzureKey(apiKey, azureRegion);
          break;
        case 'claude':
          result = await apiKeyValidationService.validateClaudeKey(apiKey);
          break;
        default:
          result = { isValid: false, error: 'Unknown key type' };
      }

      if (isMountedRef.current) {
        setValidationState(result.isValid ? 'valid' : 'invalid');
        setValidationError(result.error || '');
      }
    } catch (error) {
      if (isMountedRef.current) {
        setValidationState('invalid');
        setValidationError(error instanceof Error ? error.message : 'Validation failed');
      }
    }
  }, [keyType, azureRegion]);

  // Handle input change with debounced validation
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const newValue = e.target.value;
      onChange(newValue);

      // Clear existing timeout
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
        validationTimeoutRef.current = null;
      }

      // Set new timeout for validation
      validationTimeoutRef.current = setTimeout(() => {
        validateKey(newValue);
      }, 1000); // 1 second debounce
    } catch (error) {
      console.error('Error in handleInputChange:', error);
    }
  }, [onChange, validateKey]);

  // Handle paste events specifically
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    try {
      // Let the default paste behavior happen first
      setTimeout(() => {
        const target = e.target as HTMLInputElement;
        const newValue = target.value;
        onChange(newValue);

        // Clear existing timeout
        if (validationTimeoutRef.current) {
          clearTimeout(validationTimeoutRef.current);
          validationTimeoutRef.current = null;
        }

        // Set new timeout for validation
        validationTimeoutRef.current = setTimeout(() => {
          validateKey(newValue);
        }, 1000);
      }, 0);
    } catch (error) {
      console.error('Error in handlePaste:', error);
    }
  }, [onChange, validateKey]);

  // Handle right-click context menu
  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
    try {
      // Stop event from bubbling up which might cause page issues
      e.stopPropagation();
      // Allow the default context menu behavior
    } catch (error) {
      console.error('Error in handleContextMenu:', error);
      // Prevent any further event propagation on error
      e.stopPropagation();
      e.preventDefault();
    }
  }, []);

  // Handle mouse events to prevent any unexpected behavior
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
    try {
      // For right-click, stop propagation to prevent issues
      if (e.button === 2) {
        e.stopPropagation();
      }
    } catch (error) {
      console.error('Error in handleMouseDown:', error);
      e.stopPropagation();
    }
  }, []);

  // Handle focus events
  const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    try {
      // Stop propagation to prevent any parent handlers from interfering
      e.stopPropagation();
    } catch (error) {
      console.error('Error in handleFocus:', error);
      e.stopPropagation();
    }
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
        validationTimeoutRef.current = null;
      }
    };
  }, []);

  // Render validation indicator
  const renderValidationIndicator = () => {
    switch (validationState) {
      case 'validating':
        return (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600"></div>
          </div>
        );
      case 'valid':
        return (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="w-3 h-3 bg-green-500 rounded-full" title="API key is valid"></div>
          </div>
        );
      case 'invalid':
        return (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="w-3 h-3 bg-red-500 rounded-full" title={validationError || "API key is invalid"}></div>
          </div>
        );
      default:
        return null;
    }
  };

  const inputClassName = `w-full bg-light-bg dark:bg-base-700 border border-light-border dark:border-base-600 rounded-md px-3 py-2 pr-10 text-light-text dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary ${className}`;

  // Wrapper event handler to catch any escaping events
  const handleWrapperEvents = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    try {
      // Only stop propagation for right-click events
      if (e.button === 2 || e.type === 'contextmenu') {
        e.stopPropagation();
      }
    } catch (error) {
      console.error('Error in handleWrapperEvents:', error);
    }
  }, []);

  return (
    <div 
      onMouseDown={handleWrapperEvents}
      onContextMenu={handleWrapperEvents}
    >
      <label htmlFor={id} className="block text-sm font-medium text-light-text-secondary dark:text-gray-400 mb-2">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="password"
          value={value}
          onChange={handleInputChange}
          onPaste={handlePaste}
          onContextMenu={handleContextMenu}
          onMouseDown={handleMouseDown}
          onFocus={handleFocus}
          placeholder={placeholder}
          className={inputClassName}
        />
        {renderValidationIndicator()}
      </div>
      {helpText && (
        <p className="text-xs text-gray-500 mt-1">
          {helpText}
        </p>
      )}
      {validationState === 'invalid' && validationError && (
        <p className="text-xs text-red-500 mt-1">
          {validationError}
        </p>
      )}
    </div>
  );
};
