#!/usr/bin/env node
/**
 * Simple test runner script for the Vestaboard text formatting system
 * This script demonstrates how to run all tests and validations
 */

import { runAllTests } from './test-formatter.js';
import { runCompleteValidation, validateInput } from './validate-formatting.js';

function printSeparator(title: string) {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60));
}

function main() {
  console.log('🚀 Vestaboard Text Formatting System - Test Runner');
  console.log('This script runs comprehensive tests and validations for the text formatting system.\n');

  // Show some quick examples first
  printSeparator('QUICK EXAMPLES');
  
  const examples = [
    { input: 'Hello World', options: { horizontalAlign: 'center' as const, verticalAlign: 'middle' as const } },
    { input: 'This is a long message that will wrap', options: { horizontalAlign: 'left' as const } },
    { input: 'Hello {red} World {blue}', options: { horizontalAlign: 'center' as const } },
    { input: 'A', options: { horizontalAlign: 'right' as const, verticalAlign: 'bottom' as const } }
  ];

  examples.forEach((example, index) => {
    console.log(`\n📝 Example ${index + 1}: "${example.input}"`);
    console.log(`Options: ${JSON.stringify(example.options)}`);
    console.log('Output:');
    
    const validation = validateInput(example.input, example.options);
    if (validation.issues.length === 0) {
      console.log(validation.output.split('\n').map((line, i) => `  ${i+1}: "${line}"`).join('\n'));
    } else {
      console.log(`❌ Issues found: ${validation.issues.join(', ')}`);
    }
  });

  // Run the complete validation suite
  printSeparator('COMPLETE VALIDATION SUITE');
  const validationResults = runCompleteValidation();

  // Show final summary
  printSeparator('FINAL SUMMARY');
  
  if (validationResults.overallSuccess) {
    console.log('🎉 SUCCESS: All tests and validations passed!');
    console.log('The Vestaboard text formatting system is working correctly and ready for use.');
  } else {
    console.log('⚠️  ISSUES FOUND: Some tests or validations failed.');
    console.log('Please review the detailed results above to identify and fix issues.');
  }

  console.log('\n📊 Summary Statistics:');
  console.log(`   Unit Tests: ${validationResults.testResults.passed}/${validationResults.testResults.total} passed`);
  console.log(`   Validations: ${validationResults.validationResults.filter(r => r.passed).length}/${validationResults.validationResults.length} passed`);
  console.log(`   Backward Compatibility: ${validationResults.backwardCompatibilityResults.filter(r => r.passed).length}/${validationResults.backwardCompatibilityResults.length} passed`);

  console.log('\n📁 Available Test Files:');
  console.log('   📄 src/test-formatter.ts - Main unit test suite');
  console.log('   📄 src/validate-formatting.ts - Comprehensive validation script');
  console.log('   📄 src/test-examples.md - Complete documentation and examples');
  console.log('   📄 src/run-tests.ts - This test runner script');

  console.log('\n🛠️  How to Run Individual Tests:');
  console.log('   npm run test                    # Run this comprehensive test suite');
  console.log('   node src/test-formatter.js      # Run unit tests only');
  console.log('   node src/validate-formatting.js # Run validation checks only');

  console.log('\n📋 Test Coverage:');
  console.log('   ✅ Basic text formatting and alignment');
  console.log('   ✅ Intelligent word wrapping with boundary respect');
  console.log('   ✅ VBML color code preservation and formatting');
  console.log('   ✅ Overflow handling (truncate, ellipsis, error modes)');
  console.log('   ✅ Grid constraint validation (6x22 character matrix)');
  console.log('   ✅ Edge cases (empty strings, long words, special chars)');
  console.log('   ✅ Performance validation and benchmarking');
  console.log('   ✅ Backward compatibility with existing VBML');

  // Exit with appropriate code
  process.exit(validationResults.overallSuccess ? 0 : 1);
}

// Run the main function if this script is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  main();
}

export { main as runTestSuite };