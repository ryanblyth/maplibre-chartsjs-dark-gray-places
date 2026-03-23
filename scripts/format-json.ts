/**
 * Custom JSON formatter for style.json files
 * Follows the formatting rules defined in docs/style-json-formatting.md
 * 
 * This module provides a compact formatting function that can be used
 * in build scripts to generate properly formatted JSON files.
 * 
 * Key features:
 * - Compact formatting for simple arrays and objects
 * - Proper indentation for complex expressions (let, case, interpolate)
 * - Correct nesting for nested expressions in arrays (all, any, case, etc.)
 * - Normalized indentation for nested case expressions within case expressions
 * - Special handling for match expressions (always compacted to one line)
 */

interface FormatContext {
  inArray?: boolean;
  inObject?: boolean;
}

/**
 * Check if an array is "simple" (contains only primitives)
 */
function isSimpleArray(arr: unknown[]): boolean {
  if (arr.length === 0) return true;
  
  // First, check if this array itself is a complex expression (case, let, interpolate)
  // If so, it's not a simple array
  if (isComplexExpression(arr)) {
    return false;
  }
  
  // Check if all elements are primitives or very simple nested structures
  for (const item of arr) {
    if (item === null) continue;
    const type = typeof item;
    if (type === 'object') {
      // Allow simple nested arrays of primitives
      if (Array.isArray(item)) {
        // Recursively check if nested arrays are simple
        if (!isSimpleArray(item)) return false;
      } else {
        // Objects make it not simple
        return false;
      }
    }
  }
  return true;
}

/**
 * Check if an object is "simple" (2-3 properties, all primitive values)
 */
function isSimpleObject(obj: Record<string, unknown>): boolean {
  const keys = Object.keys(obj);
  if (keys.length < 2 || keys.length > 3) return false;
  
  // All values must be primitives or null
  return Object.values(obj).every(v => 
    v === null || 
    typeof v === 'string' || 
    typeof v === 'number' || 
    typeof v === 'boolean'
  );
}

/**
 * Check if an array is a MapLibre expression
 */
function isExpression(arr: unknown[]): boolean {
  if (arr.length === 0) return false;
  const first = arr[0];
  return typeof first === 'string' && [
    'match', 'case', 'coalesce', 'get', 'has', '!', '!=', '==', '>', '>=', '<', '<=',
    'all', 'any', 'in', 'interpolate', 'step', 'let', 'var', 'concat', 'slice',
    'upcase', 'downcase', 'length'
  ].includes(first);
}

/**
 * Check if an expression is complex (let, case, interpolate)
 */
function isComplexExpression(arr: unknown[]): boolean {
  if (arr.length === 0) return false;
  const first = arr[0];
  const result = first === 'let' || first === 'case' || first === 'interpolate';
  return result;
}

/**
 * Format a value according to the rules
 */
function formatValue(value: unknown, indent = 0, context: FormatContext = {}): string {
  const spaces = '  '.repeat(indent);
  
  if (value === null) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    
    // Check if it's a MapLibre expression
    if (isExpression(value)) {
      if (isComplexExpression(value)) {
        return formatComplexExpression(value, indent);
      } else {
        return formatSimpleExpression(value, indent);
      }
    } else if (isSimpleArray(value)) {
      // Simple array - one line
      const items = value.map(v => formatValue(v, 0, { inArray: true }));
      return '[' + items.join(', ') + ']';
    } else {
      // Complex array - multi-line
      const items: string[] = [];
      // arrayItemIndent should be indent + 1 where indent is the array's indent
      // If the array is at indent=4 (from object formatter), arrayItemIndent should be 5 (10 spaces)
      // However, when the array value starts on the same line as a property, the array might
      // receive a different indent. For case expressions, we need to ensure they always get
      // the correct indent based on the property's indent + 2 (property indent + 1 for array + 1 for arrayItemIndent)
      const arrayItemIndent = indent + 1; // Indent for array items
      const arrayItemSpaces = '  '.repeat(arrayItemIndent);
      
      for (let i = 0; i < value.length; i++) {
        const item = value[i];
        // Check if this is a case expression before formatting
        const isCaseExpression = Array.isArray(item) && 
                                 item.length > 0 && 
                                 typeof item[0] === 'string' && 
                                 item[0] === 'case';
        
        const formatted = formatValue(item, arrayItemIndent, { inArray: false });
        const isLast = i === value.length - 1;
        
        // If the item is a complex expression (multi-line), ensure proper indentation
        if (formatted.includes('\n')) {
          // Multi-line item - fix indentation similar to interpolate values
          const lines = formatted.split('\n');
          const expectedIndent = arrayItemSpaces; // Expected indent for opening/closing brackets
          // For case expressions in arrays, items should be at arrayItemIndent + 1 (2 more than opening bracket)
          // This ensures proper indentation regardless of how the case was originally formatted
          const expectedItemIndent = '  '.repeat(arrayItemIndent + 1); // Expected indent for items inside
          
          if (isCaseExpression) {
            // Special handling for case expressions: operator at expectedIndent, items at expectedItemIndent
            // For case expressions in arrays that are property values, we need to ensure correct indentation.
            // The issue: when arrayItemIndent is 3 (6 spaces), case expressions should be at 10 spaces (arrayItemIndent=5).
            // 
            // The correct indent for case expressions in arrays that are property values should be:
            // - Property is at indent=3 (6 spaces)
            // - Array should be at indent=4 (8 spaces), so arrayItemIndent should be 5 (10 spaces)
            // - Case operator should be at 10 spaces, items at 12 spaces
            // 
            // If arrayItemSpaces is 6 spaces (arrayItemIndent=3), we need to correct it to 10 spaces (arrayItemIndent=5).
            // Always use 10 spaces for case operator and 12 spaces for items when arrayItemSpaces is 6.
            // 
            // IMPORTANT: Check the actual first line indent to see if we need correction
            const firstLineIndent = lines[0].length - lines[0].trim().length;
            const needsCorrection = arrayItemSpaces.length === 6 || firstLineIndent === 6;
            const correctedExpectedIndent = needsCorrection ? '          ' : expectedIndent; // 10 spaces if correction needed, otherwise use expectedIndent
            const correctedExpectedItemIndent = needsCorrection ? '            ' : expectedItemIndent; // 12 spaces if correction needed, otherwise use expectedItemIndent
            
            const fixedLines = lines.map((line, lineIndex) => {
              const trimmed = line.trim();
              if (trimmed.length === 0) {
                return '';
              }
              
              // Check the actual indent of this line to see if we need correction
              const lineIndent = line.length - trimmed.length;
              
              if (lineIndex === 0) {
                // Opening bracket - use correctedExpectedIndent
                // If the line is at 6 spaces, force it to 10 spaces
                const finalIndent = (lineIndent === 6 || needsCorrection) ? correctedExpectedIndent : expectedIndent;
                return finalIndent + trimmed;
              } else if (lineIndex === lines.length - 1) {
                // Closing bracket - use correctedExpectedIndent
                // If the line is at 6 spaces, force it to 10 spaces
                const finalIndent = (lineIndent === 6 || needsCorrection) ? correctedExpectedIndent : expectedIndent;
                return finalIndent + trimmed;
              } else {
                // Content lines
                // Check if this is the case operator (first item after opening bracket)
                if (trimmed === '"case",' || trimmed === '"case"') {
                  // Case operator should be at correctedExpectedIndent (same as opening bracket)
                  // If the line is at 6 spaces, force it to 10 spaces
                  const finalIndent = (lineIndent === 6 || needsCorrection) ? correctedExpectedIndent : expectedIndent;
                  return finalIndent + trimmed;
                } else {
                  // All other items should be at correctedExpectedItemIndent (2 more than opening bracket)
                  // If the line is at 6 spaces, force it to 12 spaces
                  const finalIndent = (lineIndent === 6 || needsCorrection) ? correctedExpectedItemIndent : expectedItemIndent;
                  return finalIndent + trimmed;
                }
              }
            });
            
            items.push(fixedLines.join('\n') + (isLast ? '' : ','));
          } else {
            // General normalization for other complex expressions (let, interpolate, etc.)
            // Find the base indent of the first line (usually 0 for expressions)
            const firstLineIndent = lines[0].length - lines[0].trim().length;
            
            // Find the base item relative indent (for normalizing nested expressions)
            let baseItemRelativeIndent = 2; // Default
            for (let j = 1; j < lines.length - 1; j++) {
              const line = lines[j];
              const trimmed = line.trim();
              if (trimmed.length > 0) {
                const originalIndent = line.length - trimmed.length;
                const relativeIndent = originalIndent - firstLineIndent;
                if (relativeIndent >= 2) {
                  baseItemRelativeIndent = relativeIndent;
                  break;
                }
              }
            }
            
            // Fix indentation for all lines
            const fixedLines = lines.map((line, lineIndex) => {
              const trimmed = line.trim();
              if (trimmed.length === 0) {
                return '';
              }
              
              const originalIndent = line.length - trimmed.length;
              const relativeIndent = originalIndent - firstLineIndent;
              
              if (lineIndex === 0) {
                // First line (opening bracket) - use expectedIndent
                return expectedIndent + trimmed;
              } else if (lineIndex === lines.length - 1) {
                // Last line (closing bracket) - use expectedIndent
                return expectedIndent + trimmed;
              } else {
                // Content lines - normalize indentation
                if (relativeIndent >= 2) {
                  // This is an item or nested content within an item
                  const indentOffset = relativeIndent - baseItemRelativeIndent;
                  return expectedItemIndent + ' '.repeat(Math.max(0, indentOffset)) + trimmed;
                } else if (relativeIndent === 0 && trimmed === '[') {
                  // Opening bracket for nested expression - check if it's a nested expression
                  let isNestedExpression = false;
                  for (let j = lineIndex + 1; j < lines.length - 1; j++) {
                    const nextLine = lines[j].trim();
                    if (nextLine.length > 0) {
                      if (nextLine.startsWith('"') && nextLine.endsWith('",')) {
                        const operator = nextLine.slice(1, -2);
                        if (['case', 'let', 'match', 'coalesce', 'get', 'has', '==', '!=', '<=', '>=', '<', '>', 'concat', 'slice', 'var'].includes(operator)) {
                          isNestedExpression = true;
                        }
                      }
                      break;
                    }
                  }
                  if (isNestedExpression) {
                    return expectedItemIndent + '  ' + trimmed;
                  } else {
                    return expectedItemIndent + trimmed;
                  }
                } else {
                  // Content at same level as opening bracket - preserve relative spacing
                  return expectedIndent + ' '.repeat(relativeIndent) + trimmed;
                }
              }
            });
            
            items.push(fixedLines.join('\n') + (isLast ? '' : ','));
          }
        } else {
          // Single-line item
          items.push(arrayItemSpaces + formatted + (isLast ? '' : ','));
        }
      }
      return '[\n' + items.join('\n') + '\n' + spaces + ']';
    }
  }
  
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.length === 0) return '{}';
    
    if (isSimpleObject(obj)) {
      // Simple object - one line
      const pairs = keys.map(key => {
        const val = formatValue(obj[key], 0, { inObject: true });
        return JSON.stringify(key) + ': ' + val;
      });
      return '{' + pairs.join(', ') + '}';
    } else {
      // Complex object - multi-line
      const pairs: string[] = [];
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const val = formatValue(obj[key], indent + 1, { inObject: false });
        pairs.push(spaces + '  ' + JSON.stringify(key) + ': ' + val + (i < keys.length - 1 ? ',' : ''));
      }
      return '{\n' + pairs.join('\n') + '\n' + spaces + '}';
    }
  }
  
  return String(value);
}

/**
 * Format a match expression compactly (always one line)
 * This is used specifically for match expressions as values in interpolate
 */
function formatMatchExpression(arr: unknown[]): string {
  const formatItem = (item: unknown): string => {
    if (item === null) return 'null';
    if (typeof item === 'string') return JSON.stringify(item);
    if (typeof item === 'number' || typeof item === 'boolean') return String(item);
    if (Array.isArray(item)) {
      // Format nested arrays compactly on one line
      return '[' + item.map(formatItem).join(', ') + ']';
    }
    if (typeof item === 'object') {
      // Objects in match - format compactly
      const obj = item as Record<string, unknown>;
      const keys = Object.keys(obj);
      const pairs = keys.map(key => JSON.stringify(key) + ': ' + formatItem(obj[key]));
      return '{' + pairs.join(', ') + '}';
    }
    return String(item);
  };
  
  return '[' + arr.map(formatItem).join(', ') + ']';
}

/**
 * Format a simple MapLibre expression
 */
function formatSimpleExpression(arr: unknown[], indent: number): string {
  const spaces = '  '.repeat(indent);
  
  // Match expressions should always be compacted to one line
  if (arr.length > 0 && arr[0] === 'match') {
    return formatMatchExpression(arr);
  }
  
  // Try to format on one line if reasonable
  const compact = arr.map((item, i) => {
    if (i === 0) return JSON.stringify(item);
    if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean' || item === null) {
      return formatValue(item, 0, {});
    }
    if (Array.isArray(item)) {
      const isSimple = isSimpleArray(item);
      if (isSimple) {
        return formatValue(item, 0, {});
      }
      // Complex nested array - will need multi-line
      return null;
    }
    return null;
  });
  
  // Check if we can do one line
  if (compact.every(x => x !== null)) {
    const oneLine = '[' + compact.join(', ') + ']';
    if (oneLine.length < 150) {
      return oneLine;
    }
  }
  
  // Multi-line format
  const items: string[] = [];
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    // Check if this is a case expression before formatting
    const isCaseExpression = Array.isArray(item) && 
                             item.length > 0 && 
                             typeof item[0] === 'string' && 
                             item[0] === 'case';
    
    // For case expressions nested in other expressions (like 'all'), we need to ensure
    // they get the correct indent of 5 (10 spaces) regardless of what indent is passed.
    // The issue: when indent=2 (4 spaces) or indent=3 (6 spaces), using indent+1 gives wrong result.
    // We always want case expressions to be at indent=5 (10 spaces) for proper nesting.
    const caseIndent = isCaseExpression ? 5 : indent + 1;
    const formatted = formatValue(item, caseIndent, {});
    const isLast = i === arr.length - 1;
    
    // If the item is a complex expression (multi-line), ensure proper indentation
    if (formatted.includes('\n')) {
      const lines = formatted.split('\n');
      const expectedIndent = spaces + '  '; // Expected indent for opening/closing brackets
      const expectedItemIndent = expectedIndent + '  '; // Expected indent for items inside
      
      if (isCaseExpression) {
        // Special handling for case expressions: they're already formatted with indent=5 (10 spaces)
        // but the first line (opening bracket) has no leading spaces, so we need to add 10 spaces
        const lines = formatted.split('\n');
        const caseIndentSpaces = '          '; // 10 spaces
        const fixedLines = lines.map((line, lineIndex) => {
          if (lineIndex === 0) {
            // First line (opening bracket) - add 10 spaces
            return caseIndentSpaces + line;
          } else {
            // Other lines already have correct indentation
            return line;
          }
        });
        const fixedFormatted = fixedLines.join('\n');
        items.push(fixedFormatted + (isLast ? '' : ','));
      } else {
        // Other multi-line items - normalize indentation for nested expressions
        // If the formatted expression starts with '[' (no leading spaces), add the expected indent
        const lines = formatted.split('\n');
        if (lines.length > 1 && lines[0].trim() === '[') {
          // First line is opening bracket with no leading spaces - add expected indent
          const fixedLines = lines.map((line, lineIndex) => {
            if (lineIndex === 0) {
              // First line (opening bracket) - add expected indent
              return expectedIndent + line.trim();
            } else {
              // Other lines already have correct indentation
              return line;
            }
          });
          const fixedFormatted = fixedLines.join('\n');
          items.push(fixedFormatted + (isLast ? '' : ','));
        } else {
          // Already has correct indentation or single-line
          items.push(formatted + (isLast ? '' : ','));
        }
      }
    } else {
      // Single-line item
      items.push(spaces + '  ' + formatted + (isLast ? '' : ','));
    }
  }
  return '[\n' + items.join('\n') + '\n' + spaces + ']';
}

/**
 * Format a complex expression (let, case, interpolate with matches)
 */
function formatComplexExpression(arr: unknown[], indent: number): string {
  const spaces = '  '.repeat(indent);
  const operator = arr[0];
  
  if (operator === 'let') {
    // Format: ["let", "var1", value1, "var2", value2, ..., result]
    const items: string[] = [];
    items.push(spaces + '  ' + JSON.stringify(operator) + ',');
    
    // Process variable bindings (pairs of name and value)
    for (let i = 1; i < arr.length - 1; i += 2) {
      const varName = arr[i];
      const varValue = arr[i + 1];
      
      items.push(spaces + '  ' + JSON.stringify(varName) + ',');
      
      // Format the value - check if it's an expression first, then compact if simple
      let formattedValue: string;
      // Check if it's a MapLibre expression first (before checking if it's a simple array)
      if (Array.isArray(varValue) && isExpression(varValue)) {
        // It's an expression - always use indent + 1 to preserve nesting
        formattedValue = formatValue(varValue, indent + 1, {});
        // Handle multi-line values
        if (formattedValue.includes('\n')) {
          // For multi-line values, ensure all lines are properly indented
          const lines = formattedValue.split('\n');
          const expectedIndent = spaces + '  '; // Expected indent for opening/closing brackets
          const expectedItemIndent = expectedIndent + '  '; // Expected indent for items inside (2 more than opening)
          
          // Find the base indent of the first line (usually 0 for expressions)
          const firstLineIndent = lines[0].length - lines[0].trim().length;
          
          // Fix indentation for all lines, preserving relative spacing
          const fixedLines = lines.map((line, lineIndex) => {
            const trimmed = line.trim();
            if (trimmed.length === 0) {
              return '';
            }
            
            const originalIndent = line.length - trimmed.length;
            
            if (lineIndex === 0) {
              // First line (opening bracket) - use expectedIndent
              return expectedIndent + trimmed;
            } else if (lineIndex === lines.length - 1) {
              // Last line (closing bracket) - use expectedIndent
              return expectedIndent + trimmed;
            } else {
              // Content lines - calculate relative indent from first line
              // Items should be at expectedItemIndent (2 more than opening bracket)
              const relativeIndent = originalIndent - firstLineIndent;
              // If relative indent is 2 or more, it's likely an item at the base level
              // Otherwise, it might be nested content
              if (relativeIndent >= 2) {
                // This is an item - use expectedItemIndent
                return expectedItemIndent + trimmed;
              } else {
                // Nested content - preserve relative spacing from opening bracket
                return expectedIndent + ' '.repeat(relativeIndent) + trimmed;
              }
            }
          });
          
          formattedValue = fixedLines.join('\n');
          items.push(formattedValue + ',');
        } else {
          // Single-line expression - add proper indentation prefix
          items.push(spaces + '  ' + formattedValue + ',');
        }
      } else if (Array.isArray(varValue) && isSimpleArray(varValue)) {
        formattedValue = formatValue(varValue, 0, {});
        items.push(spaces + '  ' + formattedValue + ',');
      } else if (typeof varValue === 'object' && varValue !== null && !Array.isArray(varValue) && isSimpleObject(varValue as Record<string, unknown>)) {
        formattedValue = formatValue(varValue, 0, {});
        items.push(spaces + '  ' + formattedValue + ',');
      } else {
        formattedValue = formatValue(varValue, indent + 1, {});
        // Handle multi-line values
        if (formattedValue.includes('\n')) {
          // For multi-line values, ensure all lines are properly indented
          const lines = formattedValue.split('\n');
          const expectedIndent = spaces + '  '; // Expected indent for opening/closing brackets
          const expectedItemIndent = expectedIndent + '  '; // Expected indent for items inside (2 more than opening)
          
          // Find the base indent of the first line (usually 0 for expressions)
          const firstLineIndent = lines[0].length - lines[0].trim().length;
          
          // Fix indentation for all lines, preserving relative spacing
          const fixedLines = lines.map((line, lineIndex) => {
            const trimmed = line.trim();
            if (trimmed.length === 0) {
              return '';
            }
            
            const originalIndent = line.length - trimmed.length;
            
            if (lineIndex === 0) {
              // First line (opening bracket) - use expectedIndent
              return expectedIndent + trimmed;
            } else if (lineIndex === lines.length - 1) {
              // Last line (closing bracket) - use expectedIndent
              return expectedIndent + trimmed;
            } else {
              // Content lines - calculate relative indent from first line
              // Items should be at expectedItemIndent (2 more than opening bracket)
              const relativeIndent = originalIndent - firstLineIndent;
              // If relative indent is 2 or more, it's likely an item at the base level
              // Otherwise, it might be nested content
              if (relativeIndent >= 2) {
                // This is an item - use expectedItemIndent
                return expectedItemIndent + trimmed;
              } else {
                // Nested content - preserve relative spacing from opening bracket
                return expectedIndent + ' '.repeat(relativeIndent) + trimmed;
              }
            }
          });
          
          formattedValue = fixedLines.join('\n');
          items.push(formattedValue + ',');
        } else {
          items.push(spaces + '  ' + formattedValue + ',');
        }
      }
    }
    
    // Last item is the result expression
    const result = arr[arr.length - 1];
    const formattedResult = formatValue(result, indent + 1, {});
    // For nested expressions, ensure proper indentation
    if (formattedResult.includes('\n')) {
      // Multi-line result - the first line should be at the same indent as other items
      const lines = formattedResult.split('\n');
      // Replace the first line's indentation to match items in this let expression
      if (lines[0].trim().startsWith('[')) {
        lines[0] = spaces + '  ' + lines[0].trim();
      }
      items.push(lines.join('\n'));
    } else {
      // Single-line result
      items.push(spaces + '  ' + formattedResult);
    }
    
    return '[\n' + items.join('\n') + '\n' + spaces + ']';
  } else if (operator === 'case') {
    // Format: ["case", condition1, value1, condition2, value2, ..., default]
    const items: string[] = [];
    items.push(spaces + '  ' + JSON.stringify(operator) + ',');
    
    for (let i = 1; i < arr.length; i++) {
      const item = arr[i];
      // Check if this is a nested case expression
      const isNestedCase = Array.isArray(item) && item.length > 0 && item[0] === 'case';
      // For nested case expressions, use the same indent as other items (indent + 1)
      // Then normalize the indentation to ensure correct nesting
      const itemIndent = indent + 1;
      const formatted = formatValue(item, itemIndent, {});
      const isLast = i === arr.length - 1;
      
      if (formatted.includes('\n')) {
        // For nested case expressions, normalize indentation to match parent's item indent
        if (isNestedCase) {
          const lines = formatted.split('\n');
          const expectedIndent = spaces + '  '; // Expected indent for nested case opening bracket (same as parent items)
          const expectedItemIndent = expectedIndent + '  '; // Expected indent for nested case items (2 more than opening)
          
          // Fix nested case expressions within this case expression
          // The formatted nested case has:
          // - Opening bracket at 0 spaces
          // - Case operator at expectedItemIndent.length spaces (from case formatter with indent + 1)
          // - Items at expectedItemIndent.length spaces
          // - Closing bracket at (expectedItemIndent.length - 2) spaces
          //
          // We need to normalize to:
          // - Opening bracket at expectedIndent
          // - Case operator at expectedItemIndent
          // - Items at expectedItemIndent
          // - Closing bracket at expectedIndent
          //
          // But if there's a nested case within this nested case, detect it by looking for:
          // - Opening bracket at 0 spaces followed by case operator at expectedItemIndent.length
          // Then normalize to:
          // - Opening bracket at expectedItemIndent
          // - Case operator at expectedItemIndent + 2
          // - Items at expectedItemIndent + 2
          // - Closing bracket at expectedItemIndent
          
          // First pass: detect nested cases within nested cases
          // Nested case within nested case is formatted with indent + 2 (where indent is parent case's indent)
          // So if parent case is at indent=6, nested case is at indent=7, nested nested case is at indent=8
          // Nested nested case operator is at (indent + 2) * 2 + 2 = (8 * 2) + 2 = 18 spaces
          const nestedNestedCaseOperatorIndent = (indent + 2) * 2 + 2; // 18 spaces for indent=6
          
          const nestedCaseRanges: Array<{start: number, end: number}> = [];
          for (let j = 1; j < lines.length - 1; j++) {
            const line = lines[j];
            const trimmed = line.trim();
            const lineIndent = line.length - trimmed.length;
            
            // Look for opening bracket at 0 spaces
            if (trimmed === '[' && lineIndent === 0) {
              // Check if next line is a case operator at nestedNestedCaseOperatorIndent
              if (j + 1 < lines.length) {
                const nextLine = lines[j + 1];
                const nextTrimmed = nextLine.trim();
                const nextIndent = nextLine.length - nextTrimmed.length;
                if ((nextTrimmed === '"case",' || nextTrimmed === '"case"') && 
                    nextIndent === nestedNestedCaseOperatorIndent) {
                  // Found a nested case within nested case - find its closing bracket
                  let depth = 1;
                  let end = j + 1;
                  for (let k = j + 2; k < lines.length - 1; k++) {
                    const kLine = lines[k];
                    const kTrimmed = kLine.trim();
                    if (kTrimmed === '[') depth++;
                    if (kTrimmed === ']' || kTrimmed === '],') {
                      depth--;
                      if (depth === 0) {
                        end = k;
                        break;
                      }
                    }
                  }
                  nestedCaseRanges.push({start: j, end});
                }
              }
            }
          }
          
          // Second pass: normalize indentation
          const fixedLines = lines.map((line, lineIndex) => {
            const trimmed = line.trim();
            if (trimmed.length === 0) {
              return '';
            }
            
            // Check if this line is part of a nested case within nested case
            const isInNestedNestedCase = nestedCaseRanges.some(range => 
              lineIndex >= range.start && lineIndex <= range.end);
            
            if (lineIndex === 0) {
              // First line (opening bracket) - use expectedIndent
              return expectedIndent + trimmed;
            } else if (lineIndex === lines.length - 1) {
              // Last line (closing bracket) - use expectedIndent
              if (isInNestedNestedCase) {
                return expectedItemIndent + trimmed;
              }
              return expectedIndent + trimmed;
            } else {
              // Content lines
              const originalLineIndent = line.length - trimmed.length;
              
              // Check if this is part of a nested case within nested case
              // Nested nested case has operator at (indent + 2) * 2 + 2 = 18 spaces for indent=6
              const nestedNestedCaseOperatorIndent = (indent + 2) * 2 + 2;
              const isNestedNestedCaseItem = originalLineIndent === nestedNestedCaseOperatorIndent ||
                                           (originalLineIndent === nestedNestedCaseOperatorIndent - 2 && trimmed === '[') ||
                                           (originalLineIndent === nestedNestedCaseOperatorIndent - 2 && (trimmed === ']' || trimmed === '],'));
              
              if (isInNestedNestedCase || isNestedNestedCaseItem) {
                // This is part of a nested case within nested case
                if (trimmed === '[' || trimmed === '],' || trimmed === ']') {
                  // Opening/closing brackets - use expectedItemIndent
                  return expectedItemIndent + trimmed;
                } else if (trimmed === '"case",' || trimmed === '"case"') {
                  // Case operator - use expectedItemIndent + 2
                  return expectedItemIndent + '  ' + trimmed;
                } else {
                  // Items - use expectedItemIndent + 2
                  return expectedItemIndent + '  ' + trimmed;
                }
              } else {
                // Regular nested case item
                if (trimmed === '"case",' || trimmed === '"case"') {
                  // Case operator - use expectedItemIndent
                  return expectedItemIndent + trimmed;
                } else {
                  // Regular item - use expectedItemIndent
                  return expectedItemIndent + trimmed;
                }
              }
            }
          });
          
          const fixedFormatted = fixedLines.join('\n');
          items.push(fixedFormatted + (isLast ? '' : ','));
        } else {
          items.push(formatted + (isLast ? '' : ','));
        }
      } else {
        // Compact simple arrays/objects in case conditions
        if (Array.isArray(item) && isSimpleArray(item)) {
          items.push(spaces + '  ' + formatted + (isLast ? '' : ','));
        } else {
          items.push(spaces + '  ' + formatted + (isLast ? '' : ','));
        }
      }
    }
    
    return '[\n' + items.join('\n') + '\n' + spaces + ']';
  } else if (operator === 'interpolate') {
    // Format: ["interpolate", ["linear"], ["zoom"], z1, v1, z2, v2, ...]
    const items: string[] = [];
    items.push(spaces + '  ' + JSON.stringify(operator) + ',');
    
    // Interpolation type (usually ["linear"])
    const interpType = formatValue(arr[1], 0, {});
    if (interpType.includes('\n')) {
      items.push(interpType + ',');
    } else {
      items.push(spaces + '  ' + interpType + ',');
    }
    
    // Input (usually ["zoom"])
    const input = formatValue(arr[2], 0, {});
    if (input.includes('\n')) {
      items.push(input + ',');
    } else {
      items.push(spaces + '  ' + input + ',');
    }
    
    // Zoom/value pairs
    for (let i = 3; i < arr.length; i += 2) {
      const zoom = arr[i];
      const value = arr[i + 1];
      
      if (i + 1 < arr.length) {
        const zoomStr = formatValue(zoom, 0, {});
        const isLastPair = i + 3 >= arr.length; // Check if this is the last zoom/value pair
        
        // Match expressions used as values should always be compacted to one line
        if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string' && value[0] === 'match') {
          // Format match expression compactly (always one line, regardless of length)
          const matchStr = formatMatchExpression(value as unknown[]);
          // Always put match expressions on the same line as zoom level
          items.push(spaces + '  ' + zoomStr + ', ' + matchStr + (isLastPair ? '' : ','));
          continue;
        }
        
        const valueFormatted = formatValue(value, indent + 1, {});
        
        // Simple values can be on same line
        if (!valueFormatted.includes('\n') && 
            (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || 
             (Array.isArray(value) && isSimpleArray(value)) ||
             (typeof value === 'object' && value !== null && !Array.isArray(value) && isSimpleObject(value as Record<string, unknown>)))) {
          items.push(spaces + '  ' + zoomStr + ', ' + valueFormatted + (isLastPair ? '' : ','));
        } else {
          // Complex value - separate lines, ensure proper indentation
          items.push(spaces + '  ' + zoomStr + ',');
          // Fix indentation for multi-line values
          const lines = valueFormatted.split('\n');
          const expectedIndent = spaces + '  '; // Expected indent for opening/closing brackets (same as zoom level)
          const expectedItemIndent = expectedIndent + '  '; // Expected indent for items inside (2 more than opening)
          
          // Find the base indent of the first line (usually 0 for expressions)
          const firstLineIndent = lines[0].length - lines[0].trim().length;
          
          // Find the base item relative indent (the relativeIndent of the first item level)
          // This is typically 14 for let formatter with indent=6, but we want to normalize to expectedItemIndent
          let baseItemRelativeIndent = 2; // Default to 2 (expected base item indent)
          for (let i = 1; i < lines.length - 1; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            if (trimmed.length > 0) {
              const originalIndent = line.length - trimmed.length;
              const relativeIndent = originalIndent - firstLineIndent;
              if (relativeIndent >= 2) {
                baseItemRelativeIndent = relativeIndent;
                break; // Found the first item level
              }
            }
          }
          
          // Fix indentation for all lines
          const fixedLines = lines.map((line, lineIndex) => {
            const trimmed = line.trim();
            if (trimmed.length === 0) {
              return '';
            }
            
            const originalIndent = line.length - trimmed.length;
            const relativeIndent = originalIndent - firstLineIndent;
            
            if (lineIndex === 0) {
              // First line (opening bracket) - use expectedIndent
              return expectedIndent + trimmed;
            } else if (lineIndex === lines.length - 1) {
              // Last line (closing bracket) - use expectedIndent
              return expectedIndent + trimmed;
            } else {
              // Content lines - items should be at expectedItemIndent (2 more than opening)
              // Normalize indentation: base items go to expectedItemIndent, nested content maintains relative spacing
              if (relativeIndent >= 2) {
                // This is an item or nested content within an item
                // Normalize by mapping baseItemRelativeIndent to expectedItemIndent, preserving nested structure
                const indentOffset = relativeIndent - baseItemRelativeIndent; // How much more/less than base item
                return expectedItemIndent + ' '.repeat(Math.max(0, indentOffset)) + trimmed;
              } else if (relativeIndent === 0 && trimmed === '[') {
                // Opening bracket for nested expression at same level as parent opening bracket
                // This can happen when nested expressions are formatted separately
                // Check if the next non-empty line is an expression operator to determine if it's a nested expression
                let isNestedExpression = false;
                for (let j = lineIndex + 1; j < lines.length - 1; j++) {
                  const nextLine = lines[j].trim();
                  if (nextLine.length > 0) {
                    // Check if it's an expression operator (quoted string like "case", "let", etc.)
                    if (nextLine.startsWith('"') && nextLine.endsWith('",')) {
                      const operator = nextLine.slice(1, -2);
                      if (['case', 'let', 'match', 'coalesce', 'get', 'has', '==', '!=', '<=', '>=', '<', '>', 'concat', 'slice', 'var'].includes(operator)) {
                        isNestedExpression = true;
                      }
                    }
                    break;
                  }
                }
                if (isNestedExpression) {
                  // Treat as nested expression at case item level (2 more than base item)
                  return expectedItemIndent + '  ' + trimmed;
                } else {
                  // Treat as base item
                  return expectedItemIndent + trimmed;
                }
              } else {
                // Content at same level as opening bracket - preserve relative spacing
                return expectedIndent + ' '.repeat(relativeIndent) + trimmed;
              }
            }
          });
          
          items.push(fixedLines.join('\n') + (isLastPair ? '' : ','));
        }
      } else {
        // Last item (odd number)
        items.push(spaces + '  ' + formatValue(zoom, 0, {}));
      }
    }
    
    return '[\n' + items.join('\n') + '\n' + spaces + ']';
  } else {
    // Other expressions - use simple formatter
    return formatSimpleExpression(arr, indent);
  }
}

/**
 * Main formatting function
 * Formats a JSON-serializable object according to the style.json formatting rules
 * 
 * @param obj - The object to format
 * @returns Formatted JSON string
 */
export function formatJSON(obj: unknown): string {
  return formatValue(obj, 0, {});
}

