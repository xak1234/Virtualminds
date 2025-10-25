const ADMIN_LOGIN_WITH_PASSWORD_REGEX = /^(\s*)([!/])?(\s*)(login)(\s+)(admin)(\s+)(\S+)(.*)$/i;

export const sanitizeCliCommandForDisplay = (command: string): string => {
  const match = command.match(ADMIN_LOGIN_WITH_PASSWORD_REGEX);
  if (!match) return command;

  const [
    ,
    leadingWhitespace,
    prefix = '',
    prefixSpacing = '',
    loginKeyword = 'login',
    loginSpacing = ' ',
    adminKeyword = 'admin',
    passwordSpacing = ' ',
    // Password captured in match[8], intentionally ignored
    ,
    trailing = '',
  ] = match;

  return `${leadingWhitespace}${prefix}${prefixSpacing}${loginKeyword}${loginSpacing}${adminKeyword}${passwordSpacing}********${trailing}`;
};

export const isAdminLoginWithPassword = (command: string): boolean => {
  return ADMIN_LOGIN_WITH_PASSWORD_REGEX.test(command);
};

/**
 * Calculate Levenshtein distance (edit distance) between two strings
 * Returns the minimum number of single-character edits (insertions, deletions, or substitutions)
 * needed to change one string into the other.
 */
const levenshteinDistance = (str1: string, str2: string): number => {
  const len1 = str1.length;
  const len2 = str2.length;
  
  // Create a 2D array for dynamic programming
  const matrix: number[][] = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));
  
  // Initialize first row and column
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  
  // Fill in the rest of the matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  return matrix[len1][len2];
};

/**
 * Find the closest matching command from a list of valid commands
 * Returns the corrected command if within maxDistance edits, otherwise returns the original
 * @param input - The potentially misspelled command
 * @param validCommands - Array of valid command strings
 * @param maxDistance - Maximum edit distance to consider (default: 1)
 * @returns Object with corrected command and whether it was corrected
 */
export const findClosestCommand = (
  input: string,
  validCommands: string[],
  maxDistance: number = 1
): { command: string; wasCorrected: boolean; originalCommand?: string } => {
  const inputLower = input.toLowerCase();
  
  // Exact match - no correction needed
  if (validCommands.includes(inputLower)) {
    return { command: inputLower, wasCorrected: false };
  }
  
  let closestCommand = input;
  let minDistance = Infinity;
  
  // Find the closest matching command
  for (const validCmd of validCommands) {
    const distance = levenshteinDistance(inputLower, validCmd.toLowerCase());
    
    if (distance < minDistance && distance <= maxDistance) {
      minDistance = distance;
      closestCommand = validCmd;
    }
  }
  
  // If we found a close match, return it
  if (minDistance <= maxDistance && minDistance < Infinity) {
    return { 
      command: closestCommand, 
      wasCorrected: true,
      originalCommand: input
    };
  }
  
  // No close match found
  return { command: input, wasCorrected: false };
};