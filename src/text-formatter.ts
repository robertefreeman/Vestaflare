/**
 * Text formatting utilities for Vestaboard display
 * Handles intelligent word wrapping, alignment, and grid constraints
 */

// Vestaboard display constraints
const VESTABOARD_ROWS = 6;
const VESTABOARD_COLS = 22;

// Formatting options interface
export interface TextFormattingOptions {
  horizontalAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  overflowHandling?: 'truncate' | 'ellipsis' | 'error';
}

// VBML color code pattern for preservation during formatting
const VBML_COLOR_PATTERN = /\{(red|orange|yellow|green|blue|violet|white)\}/gi;

/**
 * Formats text for optimal display on Vestaboard's 6x22 character grid
 * @param rawText - The input text to format
 * @param options - Formatting options for alignment and overflow handling
 * @returns Formatted text ready for VBML conversion
 */
export function formatTextForVestaboard(
  rawText: string, 
  options: TextFormattingOptions = {}
): string {
  const {
    horizontalAlign = 'left',
    verticalAlign = 'top',
    overflowHandling = 'truncate'
  } = options;

  if (!rawText || rawText.trim().length === 0) {
    return '';
  }

  // Step 1: Preserve VBML color codes and extract them
  const colorCodes: Array<{ index: number; code: string }> = [];
  let processedText = rawText;
  
  // Find and temporarily replace color codes with placeholders
  let match;
  let offset = 0;
  const originalText = rawText;
  
  while ((match = VBML_COLOR_PATTERN.exec(originalText)) !== null) {
    const placeholder = `__COLOR_${colorCodes.length}__`;
    colorCodes.push({
      index: match.index - offset,
      code: match[0]
    });
    
    processedText = processedText.replace(match[0], placeholder);
    offset += match[0].length - placeholder.length;
  }

  // Step 2: Split into words while preserving placeholders
  const words = processedText.split(/\s+/).filter(word => word.length > 0);
  
  // Step 3: Build lines with intelligent word wrapping
  const lines = buildLinesWithWordWrapping(words, colorCodes);
  
  // Step 4: Handle overflow
  const processedLines = handleOverflow(lines, overflowHandling);
  
  // Step 5: Apply vertical alignment
  const verticallyAlignedLines = applyVerticalAlignment(processedLines, verticalAlign);
  
  // Step 6: Apply horizontal alignment
  const finalLines = verticallyAlignedLines.map(line => 
    applyHorizontalAlignment(line, horizontalAlign)
  );
  
  // Step 7: Restore color codes
  return restoreColorCodes(finalLines.join('\n'), colorCodes);
}

/**
 * Builds lines with intelligent word wrapping
 */
function buildLinesWithWordWrapping(
  words: string[], 
  colorCodes: Array<{ index: number; code: string }>
): string[] {
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    // Calculate effective length considering placeholders
    const effectiveWordLength = getEffectiveLength(word);
    const effectiveCurrentLineLength = getEffectiveLength(currentLine);
    
    // Check if word can fit on current line
    const spaceNeeded = currentLine.length > 0 ? 1 : 0; // Space before word
    
    if (effectiveCurrentLineLength + spaceNeeded + effectiveWordLength <= VESTABOARD_COLS) {
      // Word fits on current line
      if (currentLine.length > 0) {
        currentLine += ' ';
      }
      currentLine += word;
    } else {
      // Word doesn't fit, start new line
      if (currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = '';
      }
      
      // Handle very long words that exceed column limit
      if (effectiveWordLength > VESTABOARD_COLS) {
        // Split long word across multiple lines
        const splitWords = splitLongWord(word, VESTABOARD_COLS);
        for (let i = 0; i < splitWords.length - 1; i++) {
          lines.push(splitWords[i]);
        }
        currentLine = splitWords[splitWords.length - 1];
      } else {
        currentLine = word;
      }
    }
  }
  
  // Add final line if not empty
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }
  
  return lines;
}

/**
 * Gets the effective display length of text, accounting for color code placeholders
 */
function getEffectiveLength(text: string): number {
  // Count color code placeholders as 1 character each (they become single colored squares)
  return text.replace(/__COLOR_\d+__/g, 'X').length;
}

/**
 * Splits a long word across multiple lines
 */
function splitLongWord(word: string, maxLength: number): string[] {
  const parts: string[] = [];
  let remainingWord = word;
  
  while (getEffectiveLength(remainingWord) > maxLength) {
    // Find the best split point considering placeholders
    let splitPoint = maxLength;
    let currentLength = 0;
    let realIndex = 0;
    
    for (let i = 0; i < remainingWord.length && currentLength < maxLength; i++) {
      const char = remainingWord[i];
      if (remainingWord.startsWith('__COLOR_', i)) {
        // Found a placeholder
        const endIndex = remainingWord.indexOf('__', i + 2);
        if (endIndex !== -1) {
          currentLength += 1; // Placeholder counts as 1 character
          realIndex = endIndex + 2;
          i = endIndex + 1; // Skip to end of placeholder
        } else {
          currentLength += 1;
          realIndex = i + 1;
        }
      } else {
        currentLength += 1;
        realIndex = i + 1;
      }
    }
    
    splitPoint = realIndex;
    parts.push(remainingWord.substring(0, splitPoint));
    remainingWord = remainingWord.substring(splitPoint);
  }
  
  if (remainingWord.length > 0) {
    parts.push(remainingWord);
  }
  
  return parts;
}

/**
 * Handles text overflow according to the specified strategy
 */
function handleOverflow(lines: string[], overflowHandling: string): string[] {
  if (lines.length <= VESTABOARD_ROWS) {
    return lines;
  }
  
  switch (overflowHandling) {
    case 'error':
      throw new Error(`Text exceeds Vestaboard display capacity: ${lines.length} lines (max: ${VESTABOARD_ROWS})`);
    
    case 'ellipsis':
      const truncatedLines = lines.slice(0, VESTABOARD_ROWS);
      if (truncatedLines.length === VESTABOARD_ROWS) {
        // Add ellipsis to last line if there's space
        const lastLine = truncatedLines[truncatedLines.length - 1];
        const effectiveLength = getEffectiveLength(lastLine);
        
        if (effectiveLength <= VESTABOARD_COLS - 3) {
          truncatedLines[truncatedLines.length - 1] = lastLine + '...';
        } else if (effectiveLength <= VESTABOARD_COLS - 1) {
          truncatedLines[truncatedLines.length - 1] = lastLine.substring(0, lastLine.length - 2) + '...';
        } else {
          // Replace last few characters with ellipsis
          const truncateLength = Math.max(0, effectiveLength - 3);
          let truncatedLine = '';
          let currentLength = 0;
          
          for (let i = 0; i < lastLine.length && currentLength < truncateLength; i++) {
            const char = lastLine[i];
            if (lastLine.startsWith('__COLOR_', i)) {
              const endIndex = lastLine.indexOf('__', i + 2);
              if (endIndex !== -1) {
                truncatedLine += lastLine.substring(i, endIndex + 2);
                currentLength += 1;
                i = endIndex + 1;
              } else {
                truncatedLine += char;
                currentLength += 1;
              }
            } else {
              truncatedLine += char;
              currentLength += 1;
            }
          }
          
          truncatedLines[truncatedLines.length - 1] = truncatedLine + '...';
        }
      }
      return truncatedLines;
    
    case 'truncate':
    default:
      return lines.slice(0, VESTABOARD_ROWS);
  }
}

/**
 * Applies vertical alignment to the lines
 */
function applyVerticalAlignment(lines: string[], verticalAlign: string): string[] {
  if (lines.length >= VESTABOARD_ROWS || verticalAlign === 'top') {
    // Ensure we have exactly VESTABOARD_ROWS lines
    const result = [...lines];
    while (result.length < VESTABOARD_ROWS) {
      result.push('');
    }
    return result.slice(0, VESTABOARD_ROWS);
  }
  
  const emptyLines = VESTABOARD_ROWS - lines.length;
  
  switch (verticalAlign) {
    case 'middle':
      const topPadding = Math.floor(emptyLines / 2);
      const bottomPadding = emptyLines - topPadding;
      return [
        ...Array(topPadding).fill(''),
        ...lines,
        ...Array(bottomPadding).fill('')
      ];
    
    case 'bottom':
      return [
        ...Array(emptyLines).fill(''),
        ...lines
      ];
    
    case 'top':
    default:
      return [
        ...lines,
        ...Array(emptyLines).fill('')
      ];
  }
}

/**
 * Applies horizontal alignment to a single line
 */
function applyHorizontalAlignment(line: string, horizontalAlign: string): string {
  const effectiveLength = getEffectiveLength(line);
  
  if (effectiveLength >= VESTABOARD_COLS || horizontalAlign === 'left') {
    // Ensure line doesn't exceed column limit
    if (effectiveLength > VESTABOARD_COLS) {
      return truncateLineToFit(line, VESTABOARD_COLS);
    }
    return line;
  }
  
  const padding = VESTABOARD_COLS - effectiveLength;
  
  switch (horizontalAlign) {
    case 'center':
      const leftPadding = Math.floor(padding / 2);
      const rightPadding = padding - leftPadding;
      return ' '.repeat(leftPadding) + line + ' '.repeat(rightPadding);
    
    case 'right':
      return ' '.repeat(padding) + line;
    
    case 'left':
    default:
      return line + ' '.repeat(padding);
  }
}

/**
 * Truncates a line to fit within the specified length
 */
function truncateLineToFit(line: string, maxLength: number): string {
  if (getEffectiveLength(line) <= maxLength) {
    return line;
  }
  
  let truncatedLine = '';
  let currentLength = 0;
  
  for (let i = 0; i < line.length && currentLength < maxLength; i++) {
    const char = line[i];
    if (line.startsWith('__COLOR_', i)) {
      const endIndex = line.indexOf('__', i + 2);
      if (endIndex !== -1 && currentLength < maxLength) {
        truncatedLine += line.substring(i, endIndex + 2);
        currentLength += 1;
        i = endIndex + 1;
      }
    } else if (currentLength < maxLength) {
      truncatedLine += char;
      currentLength += 1;
    }
  }
  
  return truncatedLine;
}

/**
 * Restores VBML color codes from placeholders
 */
function restoreColorCodes(text: string, colorCodes: Array<{ index: number; code: string }>): string {
  let result = text;
  
  // Replace placeholders with original color codes
  for (let i = 0; i < colorCodes.length; i++) {
    const placeholder = `__COLOR_${i}__`;
    result = result.replace(placeholder, colorCodes[i].code);
  }
  
  return result;
}