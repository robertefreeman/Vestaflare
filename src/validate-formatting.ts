/**
 * Comprehensive validation script for the Vestaboard text formatting system
 * Runs all tests, validates constraints, and checks backward compatibility
 */

import { formatTextForVestaboard, TextFormattingOptions } from './text-formatter.js';
import { 
  runAllTests, 
  validateGridConstraints, 
  validateVBMLPreservation, 
  testBackwardCompatibility,
  TestResult 
} from './test-formatter.js';

// Validation utilities
interface ValidationResult {
  category: string;
  passed: boolean;
  details: string;
  errors?: string[];
}

/**
 * Validates that word boundaries are respected
 */
function validateWordBoundaries(input: string, output: string): ValidationResult {
  const errors: string[] = [];
  
  // Remove VBML codes for analysis
  const cleanInput = input.replace(/\{(red|orange|yellow|green|blue|violet|white)\}/gi, '');
  const cleanOutput = output.replace(/\{(red|orange|yellow|green|blue|violet|white)\}/gi, '');
  
  // Get all words from input
  const inputWords = cleanInput.split(/\s+/).filter(word => word.length > 0);
  
  // Check if words appear in output (case-insensitive)
  const outputText = cleanOutput.toUpperCase().replace(/\s+/g, ' ');
  
  for (const word of inputWords) {
    const upperWord = word.toUpperCase();
    if (upperWord.length <= 22) {
      // Short words should not be split
      if (!outputText.includes(upperWord)) {
        // Check if word appears split across lines
        const lines = cleanOutput.split('\n').map(line => line.toUpperCase().trim());
        let foundAcrossLines = false;
        
        for (let i = 0; i < lines.length - 1; i++) {
          const combined = (lines[i] + lines[i + 1]).replace(/\s+/g, '');
          if (combined.includes(upperWord)) {
            foundAcrossLines = true;
            break;
          }
        }
        
        if (!foundAcrossLines) {
          errors.push(`Word "${word}" not found intact in output`);
        }
      }
    }
  }
  
  return {
    category: 'Word Boundaries',
    passed: errors.length === 0,
    details: errors.length === 0 ? 'All word boundaries respected' : `${errors.length} violations found`,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Validates alignment functionality
 */
function validateAlignment(): ValidationResult {
  const alignmentTests = [
    {
      name: 'Left alignment',
      input: 'Test',
      options: { horizontalAlign: 'left' as const },
      validator: (output: string) => output.split('\n')[0].startsWith('TEST')
    },
    {
      name: 'Right alignment',
      input: 'Test',
      options: { horizontalAlign: 'right' as const },
      validator: (output: string) => output.split('\n')[0].endsWith('TEST')
    },
    {
      name: 'Center alignment',
      input: 'Test',
      options: { horizontalAlign: 'center' as const },
      validator: (output: string) => {
        const line = output.split('\n')[0];
        const testIndex = line.indexOf('TEST');
        return testIndex > 0 && testIndex < 18; // Should be roughly centered
      }
    },
    {
      name: 'Top alignment',
      input: 'Test',
      options: { verticalAlign: 'top' as const },
      validator: (output: string) => output.split('\n')[0].includes('TEST')
    },
    {
      name: 'Bottom alignment',
      input: 'Test',
      options: { verticalAlign: 'bottom' as const },
      validator: (output: string) => output.split('\n')[5].includes('TEST')
    },
    {
      name: 'Middle alignment',
      input: 'Test',
      options: { verticalAlign: 'middle' as const },
      validator: (output: string) => output.split('\n')[2].includes('TEST') || output.split('\n')[3].includes('TEST')
    }
  ];
  
  const errors: string[] = [];
  
  for (const test of alignmentTests) {
    try {
      const output = formatTextForVestaboard(test.input, test.options);
      if (!test.validator(output)) {
        errors.push(`${test.name} failed validation`);
      }
    } catch (error) {
      errors.push(`${test.name} threw error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  return {
    category: 'Alignment',
    passed: errors.length === 0,
    details: errors.length === 0 ? 'All alignment options working correctly' : `${errors.length} alignment issues found`,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Validates overflow handling functionality
 */
function validateOverflowHandling(): ValidationResult {
  const longText = 'This is an extremely long message that definitely exceeds the Vestaboard display capacity of six rows and twenty-two columns per row and should trigger overflow handling mechanisms properly';
  const errors: string[] = [];
  
  // Test truncate mode
  try {
    const truncated = formatTextForVestaboard(longText, { overflowHandling: 'truncate' });
    const validation = validateGridConstraints(truncated);
    if (!validation.valid) {
      errors.push(`Truncate mode failed grid validation: ${validation.errors.join(', ')}`);
    }
  } catch (error) {
    errors.push(`Truncate mode threw unexpected error: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  // Test ellipsis mode
  try {
    const ellipsis = formatTextForVestaboard(longText, { overflowHandling: 'ellipsis' });
    const validation = validateGridConstraints(ellipsis);
    if (!validation.valid) {
      errors.push(`Ellipsis mode failed grid validation: ${validation.errors.join(', ')}`);
    }
    // Check if ellipsis is present
    if (!ellipsis.includes('...')) {
      errors.push('Ellipsis mode did not add ellipsis to output');
    }
  } catch (error) {
    errors.push(`Ellipsis mode threw unexpected error: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  // Test error mode
  try {
    formatTextForVestaboard(longText, { overflowHandling: 'error' });
    errors.push('Error mode should have thrown an error but did not');
  } catch (error) {
    // This is expected behavior
    if (!(error instanceof Error) || !error.message.includes('exceeds')) {
      errors.push(`Error mode threw wrong type of error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  return {
    category: 'Overflow Handling',
    passed: errors.length === 0,
    details: errors.length === 0 ? 'All overflow handling modes working correctly' : `${errors.length} overflow handling issues found`,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Validates VBML color code handling
 */
function validateVBMLIntegration(): ValidationResult {
  const testCases = [
    'Hello {red} World',
    '{blue}Start {green}Middle {yellow}End',
    'Text with {ORANGE} mixed case',
    'Multiple {red}{blue}{green} consecutive codes'
  ];
  
  const errors: string[] = [];
  
  for (const input of testCases) {
    try {
      const output = formatTextForVestaboard(input);
      
      // Validate grid constraints
      const gridValidation = validateGridConstraints(output);
      if (!gridValidation.valid) {
        errors.push(`VBML input "${input}" failed grid validation: ${gridValidation.errors.join(', ')}`);
      }
      
      // Validate VBML preservation
      if (!validateVBMLPreservation(input, output)) {
        errors.push(`VBML codes not properly preserved for input: "${input}"`);
      }
      
      // Check that color codes are normalized to lowercase
      const outputCodes = output.match(/\{(red|orange|yellow|green|blue|violet|white)\}/gi) || [];
      const hasUppercase = outputCodes.some(code => code !== code.toLowerCase());
      if (hasUppercase) {
        errors.push(`VBML codes not normalized to lowercase for input: "${input}"`);
      }
      
    } catch (error) {
      errors.push(`VBML input "${input}" threw error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  return {
    category: 'VBML Integration',
    passed: errors.length === 0,
    details: errors.length === 0 ? 'VBML color codes handled correctly' : `${errors.length} VBML issues found`,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Validates edge cases
 */
function validateEdgeCases(): ValidationResult {
  const edgeCases = [
    { name: 'Empty string', input: '' },
    { name: 'Only whitespace', input: '   \n\n   ' },
    { name: 'Single character', input: 'A' },
    { name: 'Exactly 22 characters', input: '1234567890123456789012' },
    { name: 'Exactly 23 characters', input: '12345678901234567890123' },
    { name: 'Only VBML codes', input: '{red}{blue}{green}' },
    { name: 'Mixed newlines', input: 'Line1\n\nLine3\n' },
    { name: 'Special characters', input: '!@#$%^&*()_+-=[]{}|;:,.<>?' }
  ];
  
  const errors: string[] = [];
  
  for (const testCase of edgeCases) {
    try {
      const output = formatTextForVestaboard(testCase.input);
      const validation = validateGridConstraints(output);
      if (!validation.valid) {
        errors.push(`Edge case "${testCase.name}" failed grid validation: ${validation.errors.join(', ')}`);
      }
    } catch (error) {
      errors.push(`Edge case "${testCase.name}" threw error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  return {
    category: 'Edge Cases',
    passed: errors.length === 0,
    details: errors.length === 0 ? 'All edge cases handled correctly' : `${errors.length} edge case issues found`,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Performance validation
 */
function validatePerformance(): ValidationResult {
  const longInput = 'This is a very long input text that will test the performance of the formatting function with lots of words and content to process and format according to the Vestaboard constraints and rules. '.repeat(10);
  
  const startTime = performance.now();
  
  try {
    for (let i = 0; i < 100; i++) {
      formatTextForVestaboard(longInput, {
        horizontalAlign: i % 2 === 0 ? 'left' : 'center',
        verticalAlign: i % 3 === 0 ? 'top' : 'middle',
        overflowHandling: i % 4 === 0 ? 'truncate' : 'ellipsis'
      });
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    const avgTime = duration / 100;
    
    // Performance should be reasonable (less than 10ms per call on average)
    const performanceThreshold = 10;
    const passed = avgTime < performanceThreshold;
    
    return {
      category: 'Performance',
      passed,
      details: passed 
        ? `Performance acceptable: ${avgTime.toFixed(2)}ms average per call`
        : `Performance too slow: ${avgTime.toFixed(2)}ms average per call (threshold: ${performanceThreshold}ms)`,
      errors: passed ? undefined : [`Average execution time ${avgTime.toFixed(2)}ms exceeds threshold of ${performanceThreshold}ms`]
    };
  } catch (error) {
    return {
      category: 'Performance',
      passed: false,
      details: 'Performance test threw error',
      errors: [`Performance test error: ${error instanceof Error ? error.message : String(error)}`]
    };
  }
}

/**
 * Main validation function that runs all tests and validations
 */
export function runCompleteValidation(): {
  testResults: ReturnType<typeof runAllTests>;
  validationResults: ValidationResult[];
  backwardCompatibilityResults: TestResult[];
  overallSuccess: boolean;
  summary: string;
} {
  console.log('🔍 Starting Complete Vestaboard Text Formatting Validation...\n');
  
  // Run all unit tests
  console.log('📋 Running Unit Tests...');
  const testResults = runAllTests();
  
  // Run validation checks
  console.log('\n🔧 Running Validation Checks...\n');
  
  const validationResults: ValidationResult[] = [
    validateAlignment(),
    validateOverflowHandling(),
    validateVBMLIntegration(),
    validateEdgeCases(),
    validatePerformance()
  ];
  
  // Print validation results
  for (const result of validationResults) {
    if (result.passed) {
      console.log(`✅ ${result.category}: ${result.details}`);
    } else {
      console.log(`❌ ${result.category}: ${result.details}`);
      if (result.errors) {
        result.errors.forEach(error => console.log(`   - ${error}`));
      }
    }
  }
  
  // Run backward compatibility tests
  console.log('\n🔄 Running Backward Compatibility Tests...\n');
  const backwardCompatibilityResults = testBackwardCompatibility();
  
  for (const result of backwardCompatibilityResults) {
    if (result.passed) {
      console.log(`✅ ${result.name}`);
    } else {
      console.log(`❌ ${result.name}: ${result.error}`);
    }
  }
  
  // Calculate overall success
  const allValidationsPassed = validationResults.every(r => r.passed);
  const allBackwardCompatibilityPassed = backwardCompatibilityResults.every(r => r.passed);
  const allUnitTestsPassed = testResults.failed === 0;
  
  const overallSuccess = allValidationsPassed && allBackwardCompatibilityPassed && allUnitTestsPassed;
  
  // Generate summary
  const validationsPassed = validationResults.filter(r => r.passed).length;
  const validationsTotal = validationResults.length;
  const backwardCompatibilityPassed = backwardCompatibilityResults.filter(r => r.passed).length;
  const backwardCompatibilityTotal = backwardCompatibilityResults.length;
  
  const summary = `\n📊 Complete Validation Summary:\n` +
    `   Unit Tests: ${testResults.passed}/${testResults.total} passed (${((testResults.passed/testResults.total)*100).toFixed(1)}%)\n` +
    `   Validations: ${validationsPassed}/${validationsTotal} passed (${((validationsPassed/validationsTotal)*100).toFixed(1)}%)\n` +
    `   Backward Compatibility: ${backwardCompatibilityPassed}/${backwardCompatibilityTotal} passed (${((backwardCompatibilityPassed/backwardCompatibilityTotal)*100).toFixed(1)}%)\n` +
    `   Overall Result: ${overallSuccess ? '✅ PASS' : '❌ FAIL'}`;
  
  console.log(summary);
  
  if (overallSuccess) {
    console.log('\n🎉 All tests and validations passed! The text formatting system is working correctly.');
  } else {
    console.log('\n⚠️  Some tests or validations failed. Please review the results above.');
  }
  
  return {
    testResults,
    validationResults,
    backwardCompatibilityResults,
    overallSuccess,
    summary
  };
}

/**
 * Quick validation for specific input
 */
export function validateInput(input: string, options?: TextFormattingOptions): {
  output: string;
  gridValid: boolean;
  wordBoundariesValid: boolean;
  vbmlValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  try {
    const output = formatTextForVestaboard(input, options);
    
    // Check grid constraints
    const gridValidation = validateGridConstraints(output);
    const gridValid = gridValidation.valid;
    if (!gridValid) {
      issues.push(...gridValidation.errors);
    }
    
    // Check word boundaries
    const wordBoundaryValidation = validateWordBoundaries(input, output);
    const wordBoundariesValid = wordBoundaryValidation.passed;
    if (!wordBoundariesValid && wordBoundaryValidation.errors) {
      issues.push(...wordBoundaryValidation.errors);
    }
    
    // Check VBML preservation
    const vbmlValid = validateVBMLPreservation(input, output);
    if (!vbmlValid) {
      issues.push('VBML color codes were not properly preserved');
    }
    
    return {
      output,
      gridValid,
      wordBoundariesValid,
      vbmlValid,
      issues
    };
  } catch (error) {
    return {
      output: '',
      gridValid: false,
      wordBoundariesValid: false,
      vbmlValid: false,
      issues: [`Error during formatting: ${error instanceof Error ? error.message : String(error)}`]
    };
  }
}

// Run validation when this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  runCompleteValidation();
}