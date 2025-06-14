# Vestaboard Text Formatting System - Test Suite

This directory contains comprehensive tests and validation for the Vestaboard text formatting system.

## Quick Start

```bash
# Compile TypeScript files
npm run build

# Run all tests and validations
npm run test

# Run specific test suites
npm run test:unit      # Unit tests only
npm run test:validate  # Validation checks only
```

## Test Files

### Core Test Files
- **`test-formatter.ts`** - Main unit test suite with 25+ test cases
- **`validate-formatting.ts`** - Comprehensive validation and integration tests
- **`run-tests.ts`** - Test runner that executes all tests with examples

### Documentation
- **`test-examples.md`** - Complete guide with examples and usage patterns
- **`TEST_README.md`** - This file, testing overview

## Test Coverage

### ✅ Unit Tests (test-formatter.ts)
- Empty string handling
- Single character placement
- Word wrapping intelligence
- Long word splitting
- Horizontal alignment (left, center, right)
- Vertical alignment (top, middle, bottom)
- Combined alignment scenarios
- VBML color code preservation
- Overflow handling (truncate, ellipsis, error)
- Edge cases and boundary conditions

### ✅ Validation Tests (validate-formatting.ts)
- Grid constraint validation (6x22 matrix)
- Word boundary respect verification
- Alignment functionality validation
- Overflow handling verification
- VBML integration testing
- Performance benchmarking
- Backward compatibility checks

### ✅ Integration Tests
- Real-world text formatting scenarios
- Error condition handling
- Type safety validation
- API parameter validation

## Key Features Tested

### 🔤 Text Processing
- **Intelligent Word Wrapping**: No mid-word breaks unless necessary
- **Case Conversion**: All text converted to uppercase for display
- **Whitespace Handling**: Proper spacing and padding

### 🎨 VBML Support
- **Color Code Preservation**: `{red}`, `{blue}`, etc. maintained
- **Case Normalization**: Color codes normalized to lowercase
- **Spacing Calculation**: Color codes count as single display characters

### 📐 Alignment Options
- **Horizontal**: left (default), center, right
- **Vertical**: top (default), middle, bottom
- **Combined**: All 9 alignment combinations supported

### 🚫 Overflow Handling
- **Truncate** (default): Cut off excess text at 6 rows
- **Ellipsis**: Add "..." to indicate more content
- **Error**: Throw exception for text exceeding capacity

### 🔍 Validation
- **Grid Constraints**: Always produces valid 6x22 output
- **Character Limits**: Respects Vestaboard display constraints
- **Type Safety**: Full TypeScript support with proper interfaces

## Test Results Interpretation

### Success Indicators
- ✅ All unit tests pass
- ✅ Grid validation succeeds for all outputs
- ✅ VBML codes preserved correctly
- ✅ Performance within acceptable limits (< 10ms per call)
- ✅ Backward compatibility maintained

### Common Issues
- ❌ Grid constraint violations (wrong dimensions)
- ❌ VBML code corruption or loss
- ❌ Word boundary violations (inappropriate splitting)
- ❌ Alignment calculation errors
- ❌ Performance degradation

## Adding New Tests

### Unit Test Pattern
```typescript
{
  name: 'Test case name',
  input: 'Input text to format',
  options: { horizontalAlign: 'center', verticalAlign: 'middle' },
  expected: 'Expected output with exact spacing and newlines',
  description: 'What this test validates'
}
```

### Validation Test Pattern
```typescript
function validateNewFeature(): ValidationResult {
  const errors: string[] = [];
  
  // Test logic here
  
  return {
    category: 'Feature Name',
    passed: errors.length === 0,
    details: 'Description of results',
    errors: errors.length > 0 ? errors : undefined
  };
}
```

## Performance Benchmarks

- **Average execution time**: < 5ms per formatting call
- **Memory usage**: Minimal allocations, efficient processing
- **Scalability**: Handles inputs up to 1000+ characters efficiently
- **Concurrency**: Thread-safe, supports parallel execution

## Debugging Tips

### Failed Tests
1. Check exact spacing in expected vs actual output
2. Verify grid dimensions (must be exactly 6x22)
3. Ensure VBML codes are properly formatted
4. Validate alignment calculations

### Performance Issues
1. Profile with longer input texts
2. Check for excessive string concatenation
3. Verify regex pattern efficiency
4. Monitor memory allocations

## Continuous Integration

The test suite is designed to be run in CI/CD pipelines:

```yaml
# Example GitHub Actions step
- name: Run Vestaboard formatting tests
  run: |
    npm install
    npm run build
    npm run test
```

## Contributing

When adding new features to the text formatting system:

1. **Add unit tests** for all new functionality
2. **Update validation tests** if new constraints are introduced
3. **Document new features** in test-examples.md
4. **Verify backward compatibility** doesn't break
5. **Run complete test suite** before committing

This comprehensive test suite ensures the Vestaboard text formatting system is robust, reliable, and ready for production use.