/**
 * Text filtering service to extract first-person speech from AI responses
 * and filter out action descriptions for TTS
 */

/**
 * Filters text to extract only first-person speech suitable for TTS
 * Removes action text, stage directions, and third-person descriptions
 * @param text - The raw AI response text
 * @returns Filtered text containing only first-person speech
 */
export const filterForSpeech = (text: string): string => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Since AI is now instructed to speak in first person only without action descriptions,
  // we mainly need to clean up any remaining formatting artifacts
  let result = text
    .replace(/\*[^*]*\*/g, '') // Remove any remaining *action text*
    .replace(/\[[^\]]*\]/g, '') // Remove any remaining [stage directions]
    .replace(/\([^)]*\)/g, '') // Remove any remaining (parenthetical actions)
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\.\s*\./g, '.') // Remove double periods
    .replace(/^[.!?]+/, '') // Remove leading punctuation
    .trim();

  // Add final period if needed
  if (result && !/[.!?]$/.test(result)) {
    result += '.';
  }

  // If the result is still too short (suggesting over-filtering), fall back to original
  if (result.length < text.length * 0.5) {
    console.log('TTS filter removed too much content, using original text');
    return text.trim();
  }

  return result;
};

/**
 * Alternative simpler filter that just removes action text in common formats
 * @param text - The raw AI response text
 * @returns Text with action descriptions removed
 */
export const removeActionText = (text: string): string => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .replace(/\*[^*]*\*/g, '') // Remove *action text*
    .replace(/\[[^\]]*\]/g, '') // Remove [stage directions]
    .replace(/\([^)]*\)/g, '') // Remove (parenthetical actions)
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
};

/**
 * Adds natural pauses to text based on punctuation for more natural speech flow
 * @param text - The text to process
 * @returns Text with natural pause markers
 */
export const addNaturalPauses = (text: string): string => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    // Add short pause after commas
    .replace(/,\s+/g, ', <break time="300ms"/> ')
    // Add medium pause after semicolons
    .replace(/;\s+/g, '; <break time="500ms"/> ')
    // Add longer pause after periods
    .replace(/\.\s+/g, '. <break time="700ms"/> ')
    // Add pause after question marks and exclamation points
    .replace(/[!?]\s+/g, (match) => match.trim() + ' <break time="600ms"/> ')
    // Add slight pause after colons
    .replace(/:\s+/g, ': <break time="400ms"/> ')
    // Add breathing pause for long sentences (after conjunctions)
    .replace(/\s+(and|but|or|so|yet|however|therefore|meanwhile)\s+/gi, 
             ' <break time="200ms"/> $1 <break time="200ms"/> ');
};
