/**
 * Comprehensive test suite for the Vestaboard text formatting system
 * Tests all core functionality including word wrapping, alignment, overflow handling, and VBML integration
 */

import { formatTextForVestaboard, TextFormattingOptions } from './text-formatter.js';

// Test utilities
interface TestCase {
  name: string;
  input: string;
  options?: TextFormattingOptions;
  expected: string;
  description: string;
}

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  actual?: string;
  expected?: string;
}

// Constants for validation
const VESTABOARD_ROWS = 6;
const VESTABOARD_COLS = 22;

/**
 * Validates that output conforms to Vestaboard grid constraints
 */
function validateGridConstraints(output: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const lines = output.split('\n');
  
  if (lines.length !== VESTABOARD_ROWS) {
    errors.push(`Expected ${VESTABOARD_ROWS} rows, got ${lines.length}`);
  }
  
  lines.forEach((line, index) => {
    if (line.length !== VESTABOARD_COLS) {
      errors.push(`Row ${index + 1}: Expected ${VESTABOARD_COLS} characters, got ${line.length}`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Counts effective display characters (treating VBML codes as single characters)
 */
function countEffectiveCharacters(text: string): number {
  return text.replace(/\{(red|orange|yellow|green|blue|violet|white)\}/gi, 'X').length;
}

/**
 * Runs a single test case
 */
function runTest(testCase: TestCase): TestResult {
  try {
    const actual = formatTextForVestaboard(testCase.input, testCase.options);
    const gridValidation = validateGridConstraints(actual);
    
    if (!gridValidation.valid) {
      return {
        name: testCase.name,
        passed: false,
        error: `Grid constraint violations: ${gridValidation.errors.join(', ')}`,
        actual,
        expected: testCase.expected
      };
    }
    
    // Normalize whitespace for comparison
    const normalizedActual = actual.trim();
    const normalizedExpected = testCase.expected.trim();
    
    const passed = normalizedActual === normalizedExpected;
    
    return {
      name: testCase.name,
      passed,
      error: passed ? undefined : 'Output does not match expected result',
      actual,
      expected: testCase.expected
    };
  } catch (error) {
    return {
      name: testCase.name,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
      actual: undefined,
      expected: testCase.expected
    };
  }
}

/**
 * Test cases covering all functionality
 */
const testCases: TestCase[] = [
  // Basic functionality tests
  {
    name: 'Empty string',
    input: '',
    expected: '                      \n                      \n                      \n                      \n                      \n                      ',
    description: 'Empty string should return empty grid'
  },
  {
    name: 'Single character',
    input: 'A',
    expected: 'A                     \n                      \n                      \n                      \n                      \n                      ',
    description: 'Single character should be placed at top-left by default'
  },
  {
    name: 'Simple short text',
    input: 'Hello World',
    expected: 'HELLO WORLD           \n                      \n                      \n                      \n                      \n                      ',
    description: 'Simple text should be left-aligned at top by default'
  },
  {
    name: 'Exact column width',
    input: '1234567890123456789012',
    expected: '1234567890123456789012\n                      \n                      \n                      \n                      \n                      ',
    description: 'Text exactly matching column width should fit on one line'
  },

  // Word wrapping tests
  {
    name: 'Basic word wrapping',
    input: 'This is a long message that needs wrapping',
    expected: 'THIS IS A LONG MESSAGE\nTHAT NEEDS WRAPPING   \n                      \n                      \n                      \n                      ',
    description: 'Long text should wrap at word boundaries'
  },
  {
    name: 'Very long word splitting',
    input: 'Supercalifragilisticexpialidocious',
    expected: 'SUPERCALIFRAGILISTICEX\nPIALIDOCIOUS          \n                      \n                      \n                      \n                      ',
    description: 'Words longer than 22 characters should be split'
  },
  {
    name: 'Multiple long words',
    input: 'Antidisestablishmentarianism and Pneumonoultramicroscopicsilicovolcanoconiosis',
    expected: 'ANTIDISESTABLISHMENTA\nRIANISM AND           \nPNEUMONOULTRAMICROSCO\nPICSILICOVOLCANOCONIO\nSIS                   \n                      ',
    description: 'Multiple long words should each be handled appropriately'
  },

  // Horizontal alignment tests
  {
    name: 'Center alignment - short text',
    input: 'Hello',
    options: { horizontalAlign: 'center' },
    expected: '        HELLO         \n                      \n                      \n                      \n                      \n                      ',
    description: 'Short text should be centered horizontally'
  },
  {
    name: 'Right alignment - short text',
    input: 'Hello',
    options: { horizontalAlign: 'right' },
    expected: '                 HELLO\n                      \n                      \n                      \n                      \n                      ',
    description: 'Short text should be right-aligned'
  },
  {
    name: 'Center alignment - multi-line',
    input: 'Hello World',
    options: { horizontalAlign: 'center' },
    expected: '     HELLO WORLD      \n                      \n                      \n                      \n                      \n                      ',
    description: 'Single line should be centered'
  },

  // Vertical alignment tests
  {
    name: 'Middle vertical alignment',
    input: 'Hello',
    options: { verticalAlign: 'middle' },
    expected: '                      \n                      \nHELLO                 \n                      \n                      \n                      ',
    description: 'Text should be vertically centered'
  },
  {
    name: 'Bottom vertical alignment',
    input: 'Hello',
    options: { verticalAlign: 'bottom' },
    expected: '                      \n                      \n                      \n                      \n                      \nHELLO                 ',
    description: 'Text should be bottom-aligned'
  },
  {
    name: 'Combined center alignment',
    input: 'Hi',
    options: { horizontalAlign: 'center', verticalAlign: 'middle' },
    expected: '                      \n                      \n          HI          \n                      \n                      \n                      ',
    description: 'Text should be centered both horizontally and vertically'
  },

  // VBML color code tests
  {
    name: 'Single color code',
    input: 'Hello {red} World',
    expected: 'HELLO {red} WORLD     \n                      \n                      \n                      \n                      \n                      ',
    description: 'VBML color codes should be preserved'
  },
  {
    name: 'Multiple color codes',
    input: '{red}Red {blue}Blue {green}Green',
    expected: '{red}RED {blue}BLUE      \n{green}GREEN         \n                      \n                      \n                      \n                      ',
    description: 'Multiple VBML color codes should be preserved and wrapped correctly'
  },
  {
    name: 'Color codes with center alignment',
    input: 'Hi {red} There',
    options: { horizontalAlign: 'center' },
    expected: '    HI {red} THERE     \n                      \n                      \n                      \n                      \n                      ',
    description: 'VBML codes should work correctly with alignment'
  },

  // Overflow handling tests
  {
    name: 'Truncate overflow',
    input: 'This is a very long message that definitely exceeds the six row limit and should be truncated when using truncate mode',
    options: { overflowHandling: 'truncate' },
    expected: 'THIS IS A VERY LONG   \nMESSAGE THAT          \nDEFINITELY EXCEEDS THE\nSIX ROW LIMIT AND     \nSHOULD BE TRUNCATED   \nWHEN USING TRUNCATE   ',
    description: 'Overflow text should be truncated at 6 rows'
  },
  {
    name: 'Ellipsis overflow',
    input: 'This is a very long message that definitely exceeds the six row limit and should show ellipsis when using ellipsis mode',
    options: { overflowHandling: 'ellipsis' },
    expected: 'THIS IS A VERY LONG   \nMESSAGE THAT          \nDEFINITELY EXCEEDS THE\nSIX ROW LIMIT AND     \nSHOULD SHOW ELLIPSIS  \nWHEN USING ELLIP...   ',
    description: 'Overflow text should be truncated with ellipsis'
  },

  // Edge cases
  {
    name: 'Only whitespace',
    input: '   \n\n   ',
    expected: '                      \n                      \n                      \n                      \n                      \n                      ',
    description: 'Whitespace-only input should result in empty grid'
  },
  {
    name: 'Single long word exactly 22 chars',
    input: 'abcdefghijklmnopqrstuv',
    expected: 'ABCDEFGHIJKLMNOPQRSTUV\n                      \n                      \n                      \n                      \n                      ',
    description: 'Word exactly 22 characters should fit on one line'
  },
  {
    name: 'Mixed case preservation in VBML',
    input: 'Hello {RED} world {Blue}',
    expected: 'HELLO {red} WORLD     \n{blue}                \n                      \n                      \n                      \n                      ',
    description: 'VBML color codes should be normalized to lowercase'
  }
];

/**
 * Test cases that should throw errors
 */
const errorTestCases: TestCase[] = [
  {
    name: 'Error overflow handling',
    input: 'This is a very long message that definitely exceeds the six row limit and should throw an error when using error mode for overflow handling',
    options: { overflowHandling: 'error' },
    expected: '', // Not used for error tests
    description: 'Should throw error when text exceeds capacity and overflowHandling is set to error'
  }
];

/**
 * Runs all test cases and returns results
 */
export function runAllTests(): { 
  total: number; 
  passed: number; 
  failed: number; 
  results: TestResult[];
  summary: string;
} {
  console.log('🧪 Running Vestaboard Text Formatter Tests...\n');
  
  const results: TestResult[] = [];
  
  // Run normal test cases
  for (const testCase of testCases) {
    const result = runTest(testCase);
    results.push(result);
    
    if (result.passed) {
      console.log(`✅ ${result.name}`);
    } else {
      console.log(`❌ ${result.name}`);
      console.log(`   Error: ${result.error}`);
      if (result.actual && result.expected) {
        console.log('   Expected:');
        console.log(result.expected.split('\n').map((line, i) => `     ${i+1}: "${line}"`).join('\n'));
        console.log('   Actual:');
        console.log(result.actual.split('\n').map((line, i) => `     ${i+1}: "${line}"`).join('\n'));
      }
      console.log();
    }
  }
  
  // Run error test cases
  console.log('\n🔥 Running Error Test Cases...\n');
  
  for (const testCase of errorTestCases) {
    try {
      formatTextForVestaboard(testCase.input, testCase.options);
      // If we reach here, the test failed (should have thrown)
      results.push({
        name: testCase.name,
        passed: false,
        error: 'Expected error to be thrown, but none was thrown'
      });
      console.log(`❌ ${testCase.name} - Expected error but none was thrown`);
    } catch (error) {
      // Error was thrown as expected
      results.push({
        name: testCase.name,
        passed: true
      });
      console.log(`✅ ${testCase.name} - Correctly threw error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  
  const summary = `\n📊 Test Results Summary:\n` +
    `   Total Tests: ${total}\n` +
    `   Passed: ${passed}\n` +
    `   Failed: ${failed}\n` +
    `   Success Rate: ${((passed / total) * 100).toFixed(1)}%`;
  
  console.log(summary);
  
  return { total, passed, failed, results, summary };
}

/**
 * Validates VBML color code preservation
 */
export function validateVBMLPreservation(input: string, output: string): boolean {
  const inputCodes = (input.match(/\{(red|orange|yellow|green|blue|violet|white)\}/gi) || []);
  const outputCodes = (output.match(/\{(red|orange|yellow|green|blue|violet|white)\}/gi) || []);
  
  // Convert to lowercase for comparison
  const normalizedInputCodes = inputCodes.map(code => code.toLowerCase()).sort();
  const normalizedOutputCodes = outputCodes.map(code => code.toLowerCase()).sort();
  
  return JSON.stringify(normalizedInputCodes) === JSON.stringify(normalizedOutputCodes);
}

/**
 * Tests backward compatibility with existing VBML functionality
 */
export function testBackwardCompatibility(): TestResult[] {
  const legacyTests: TestCase[] = [
    {
      name: 'Legacy VBML - simple text',
      input: 'HELLO WORLD',
      expected: 'HELLO WORLD           \n                      \n                      \n                      \n                      \n                      ',
      description: 'Legacy uppercase text should work as before'
    },
    {
      name: 'Legacy VBML - with colors',
      input: 'HELLO {RED} WORLD',
      expected: 'HELLO {red} WORLD     \n                      \n                      \n                      \n                      \n                      ',
      description: 'Legacy color codes should be normalized'
    }
  ];
  
  return legacyTests.map(runTest);
}

// Export test utilities for use in other test files
export { TestCase, TestResult, validateGridConstraints, countEffectiveCharacters, runTest };

// Run tests when this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  runAllTests();
}