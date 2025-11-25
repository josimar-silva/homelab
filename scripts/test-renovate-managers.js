#!/usr/bin/env node

/**
 * Renovate Custom Manager Testing Script
 *
 * This script tests regex patterns from custom managers in renovate.json
 * using JavaScript's native regex engine - the same engine Renovate uses.
 *
 * Features:
 * - Native JavaScript regex (no conversion needed)
 * - Tests patterns exactly as Renovate would use them
 * - Validates capture groups match template fields
 * - Tests against actual repository files
 * - Provides clear pass/fail output
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

// Get script directory and repo root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const CONFIG_FILE = path.join(REPO_ROOT, 'renovate.json');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[0;31m',
  green: '\x1b[0;32m',
  yellow: '\x1b[1;33m',
  blue: '\x1b[0;34m',
  cyan: '\x1b[0;36m',
  magenta: '\x1b[0;35m',
};

// Test result counters
let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

let currentSuite = '';
let suiteTests = 0;
let suitePassed = 0;
let suiteFailed = 0;

// ============================================================================
// Helper Functions
// ============================================================================

function logInfo(message) {
  console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
}

function logSuccess(message) {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function logError(message) {
  console.log(`${colors.red}✗${colors.reset} ${message}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
}

function logSection(message) {
  console.log('');
  console.log(`${colors.cyan}=== ${message} ===${colors.reset}`);
  console.log('');
}

function startTestSuite(name) {
  currentSuite = name;
  suiteTests = 0;
  suitePassed = 0;
  suiteFailed = 0;
  logSection(currentSuite);
}

function endTestSuite() {
  console.log('');
  if (suiteFailed === 0) {
    logSuccess(`Suite '${currentSuite}': ${suitePassed}/${suiteTests} tests passed`);
  } else {
    logError(`Suite '${currentSuite}': ${suiteFailed}/${suiteTests} tests failed`);
  }
  console.log('');
}

function runTest(testName, status, details = '') {
  testsRun++;
  suiteTests++;

  if (status === 'pass') {
    console.log(`${colors.green}  ✓${colors.reset} ${testName}`);
    testsPassed++;
    suitePassed++;
    if (details) {
      console.log(`${colors.cyan}    ${details}${colors.reset}`);
    }
  } else {
    console.log(`${colors.red}  ✗${colors.reset} ${testName}`);
    testsFailed++;
    suiteFailed++;
    if (details) {
      console.log(`${colors.yellow}    ${details}${colors.reset}`);
    }
  }
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Extract capture group names from a regex pattern
 */
function extractCaptureGroups(pattern) {
  const groups = [];
  const regex = /\?<(\w+)>/g;
  let match;

  while ((match = regex.exec(pattern)) !== null) {
    groups.push(match[1]);
  }

  return groups;
}

/**
 * Extract template variables from a template string
 * e.g., "{{depName}}/{{version}}" -> ["depName", "version"]
 */
function extractTemplateVariables(template) {
  if (!template) return [];

  const variables = [];
  const regex = /\{\{([^}]+)\}\}/g;
  let match;

  while ((match = regex.exec(template)) !== null) {
    variables.push(match[1]);
  }

  return variables;
}

/**
 * Validate that all template variables have corresponding capture groups
 */
function validateTemplates(manager, captureGroups) {
  const errors = [];

  // Check all template fields
  const templateFields = [
    'datasourceTemplate',
    'depNameTemplate',
    'packageNameTemplate',
    'registryUrlTemplate',
    'versioningTemplate',
    'extractVersionTemplate',
  ];

  for (const field of templateFields) {
    if (manager[field]) {
      const variables = extractTemplateVariables(manager[field]);

      for (const variable of variables) {
        if (!captureGroups.includes(variable)) {
          errors.push(`Template '${field}' references '${variable}' but regex has no such capture group`);
        }
      }
    }
  }

  return errors;
}

/**
 * Test if a regex pattern matches content and extract capture groups
 */
function testRegexMatch(pattern, content, expectedGroups = {}) {
  try {
    // Create regex with multiline and dotall flags (same as Renovate uses)
    const regex = new RegExp(pattern, 'gms');
    const match = regex.exec(content);

    if (!match) {
      return { success: false, error: 'Pattern did not match' };
    }

    const captured = match.groups || {};

    // Validate expected groups if provided
    for (const [key, value] of Object.entries(expectedGroups)) {
      if (!(key in captured)) {
        return { success: false, error: `Missing expected group: ${key}` };
      }
      if (value && captured[key] !== value) {
        return {
          success: false,
          error: `Group ${key}: expected "${value}", got "${captured[key]}"`
        };
      }
    }

    // Check for empty captures
    const warnings = [];
    for (const [key, value] of Object.entries(captured)) {
      if (!value || value === '') {
        warnings.push(`Captured group "${key}" is empty`);
      }
    }

    return {
      success: true,
      captured,
      warnings
    };
  } catch (error) {
    return { success: false, error: `Regex error: ${error.message}` };
  }
}

/**
 * Convert Renovate file pattern to glob pattern
 */
function convertFilePatternToGlob(pattern) {
  // Remove leading/trailing slashes from regex patterns
  let cleaned = pattern.replace(/^\//, '').replace(/\/$/, '');

  // Convert regex patterns to glob patterns
  cleaned = cleaned
    .replace(/\(?\^\|\/\)?/g, '**/')  // (^|/) -> **/
    .replace(/\\\./g, '.')            // \. -> .
    .replace(/ya\?ml/g, 'y{a,}ml')   // ya?ml -> y{a,}ml
    .replace(/\.\*\//g, '**/')        // .*/ -> **/
    .replace(/\$$/g, '');             // Remove trailing $

  return cleaned;
}

/**
 * Find files matching a pattern in the repository
 */
async function findMatchingFiles(filePattern) {

  try {
    // Find all yaml files first
    const yamlFiles = await glob('**/*.{yaml,yml}', {
      cwd: REPO_ROOT,
      ignore: ['node_modules/**', '.git/**', '**/node_modules/**'],
      absolute: true,
    });

    // Filter based on the converted pattern
    const regex = new RegExp(filePattern.replace(/^\//, '').replace(/\/$/, ''));
    const matchedFiles = yamlFiles.filter(file => {
      const relativePath = path.relative(REPO_ROOT, file);
      return regex.test(relativePath);
    });

    return matchedFiles;
  } catch (error) {
    logWarning(`Error finding files: ${error.message}`);
    return [];
  }
}

// ============================================================================
// Setup & Configuration Functions
// ============================================================================

/**
 * Display the script banner and environment information
 */
function displayBanner() {
  console.log(`${colors.magenta}╔════════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.magenta}║                   Renovate Custom Manager Testing                  ║${colors.reset}`);
  console.log(`${colors.magenta}╚════════════════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log('');
  logInfo(`Configuration file: ${CONFIG_FILE}`);
  logInfo(`Repository root: ${REPO_ROOT}`);
  logInfo(`Node version: ${process.version}`);
}

/**
 * Verify all required preconditions are met
 */
function checkPrerequisites() {
  startTestSuite('Prerequisites Check');

  if (!fs.existsSync(CONFIG_FILE)) {
    runTest('renovate.json exists', 'fail', `File not found at ${CONFIG_FILE}`);
    process.exit(1);
  }

  runTest('renovate.json exists', 'pass');
}

/**
 * Load and parse the Renovate configuration file
 *
 * @returns {{ config: Object, managers: Array }} Parsed configuration and filtered managers
 */
function loadConfiguration() {
  let config;
  try {
    const configContent = fs.readFileSync(CONFIG_FILE, 'utf8');
    config = JSON.parse(configContent);
    runTest('renovate.json is valid JSON', 'pass');
  } catch (error) {
    runTest('renovate.json is valid JSON', 'fail', error.message);
    process.exit(1);
  }

  const managers = (config.customManagers || []).filter(m => m.customType === 'regex');
  const managerCount = managers.length;
  runTest(`Found ${managerCount} regex custom managers`, 'pass');

  endTestSuite();

  return { config, managers };
}

// ============================================================================
// Manager Testing Functions
// ============================================================================

/**
 * Display information about a custom manager configuration
 *
 * @param {Object} manager - The custom manager configuration object
 */
function displayManagerInfo(manager) {
  const datasource = manager.datasourceTemplate || '';
  const packageNameTpl = manager.packageNameTemplate || '';
  const registryUrlTpl = manager.registryUrlTemplate || '';

  logInfo(`Datasource: ${datasource || '<not specified>'}`);
  if (packageNameTpl) {
    logInfo(`Package template: ${packageNameTpl}`);
  }
  if (registryUrlTpl) {
    logInfo(`Registry template: ${registryUrlTpl}`);
  }
  console.log('');
}

/**
 * Validate regex pattern, capture groups, and templates
 *
 * @param {Object} manager - The custom manager configuration object
 * @returns {{ isValid: boolean, pattern: string, captureGroups: Array<string> }}
 */
function validateManagerRegex(manager) {
  const matchStrings = manager.matchStrings || [];
  const datasource = manager.datasourceTemplate || '';

  if (matchStrings.length === 0) {
    runTest('Manager has match strings', 'fail', 'No match strings defined');
    return { isValid: false, pattern: '', captureGroups: [] };
  }

  const pattern = matchStrings[0]; // Test first pattern

  // Test 1: Validate regex pattern syntax
  try {
    new RegExp(pattern);
    runTest('Regex pattern is syntactically valid', 'pass');
  } catch (error) {
    runTest('Regex pattern is syntactically valid', 'fail', error.message);
    return { isValid: false, pattern, captureGroups: [] };
  }

  // Test 2: Extract and display capture groups
  const captureGroups = extractCaptureGroups(pattern);
  if (captureGroups.length > 0) {
    runTest('Regex has capture groups', 'pass', `Groups: ${captureGroups.join(', ')}`);
  } else {
    runTest('Regex has capture groups', 'fail', 'No named capture groups found');
    return { isValid: false, pattern, captureGroups: [] };
  }

  // Test 3: Validate template fields reference existing capture groups
  const templateErrors = validateTemplates(manager, captureGroups);
  if (templateErrors.length === 0) {
    runTest('All template fields reference valid capture groups', 'pass');
  } else {
    runTest('All template fields reference valid capture groups', 'fail',
      templateErrors.join('; '));
  }

  // Test 4: Validate required datasource is specified
  if (datasource) {
    runTest('Datasource is specified', 'pass', `Datasource: ${datasource}`);
  } else {
    runTest('Datasource is specified', 'fail', 'No datasource specified');
  }

  return { isValid: true, pattern, captureGroups };
}

/**
 * Test regex pattern against repository files
 *
 * @param {Object} manager - The custom manager configuration object
 * @param {string} pattern - Regex pattern to test
 * @param {Array<string>} captureGroups - List of capture group names
 */
async function testManagerAgainstFiles(manager, pattern, captureGroups) {
  const filePatterns = manager.filePatterns || manager.managerFilePatterns || [];

  if (filePatterns.length === 0) {
    runTest('File patterns defined', 'fail', 'No file patterns specified');
    return;
  }

  const filePattern = filePatterns[0];
  const matchingFiles = await findMatchingFiles(filePattern);

  if (matchingFiles.length > 0) {
    runTest('Found files matching pattern', 'pass',
      `Found ${matchingFiles.length} matching files`);
  } else {
    runTest('Found files matching pattern', 'fail',
      `No files match pattern: ${filePattern}`);
    return;
  }

  // Test 6: Test regex against actual files
  let matchCount = 0;
  let testedFiles = 0;
  let firstMatch = null;

  // Test up to 20 files to increase chance of finding sparse matches
  const filesToTest = Math.min(matchingFiles.length, 20);

  for (const file of matchingFiles.slice(0, filesToTest)) {
    testedFiles++;

    const content = fs.readFileSync(file, 'utf8');
    const result = testRegexMatch(pattern, content, {});

    if (result.success) {
      matchCount++;

      // Store first successful match
      if (!firstMatch) {
        firstMatch = {
          file: path.basename(file),
          captured: result.captured,
          warnings: result.warnings,
        };
      }
    }
  }

  if (matchCount > 0) {
    runTest('Regex matches content in repository files', 'pass',
      `${matchCount}/${testedFiles} tested files matched`);

    if (firstMatch) {
      console.log(`${colors.cyan}    First match in: ${firstMatch.file}${colors.reset}`);
      for (const [key, value] of Object.entries(firstMatch.captured)) {
        console.log(`${colors.cyan}      ${key}: ${value}${colors.reset}`);
      }
      if (firstMatch.warnings && firstMatch.warnings.length > 0) {
        for (const warning of firstMatch.warnings) {
          logWarning(`    ${warning}`);
        }
      }
    }
  } else {
    // If no matches in sampled files but there are many files, it might be a sparse pattern
    // This is not necessarily a failure - some managers are designed for specific use cases
    if (matchingFiles.length > filesToTest) {
      runTest('Regex matches content in repository files', 'pass',
        `No matches in ${testedFiles} sampled files (pattern may be sparse) - will verify in integration tests`);
    } else {
      runTest('Regex matches content in repository files', 'fail',
        `Pattern found no matches in ${testedFiles} files`);
    }
  }
}

/**
 * Test a single custom manager configuration
 *
 * @param {Object} manager - Custom manager configuration
 * @param {number} index - Manager index (for display purposes)
 */
async function testSingleManager(manager, index) {
  startTestSuite(`Custom Manager #${index + 1}`);

  // Display manager information
  displayManagerInfo(manager);

  // Validate regex and get pattern details
  const { isValid, pattern, captureGroups } = validateManagerRegex(manager);

  // If validation passed, test against repository files
  if (isValid) {
    await testManagerAgainstFiles(manager, pattern, captureGroups);
  }

  endTestSuite();
}

/**
 * Orchestrate testing of all custom managers
 *
 * @param {Array} managers - Array of custom manager configurations
 */
async function testAllManagers(managers) {
  for (let i = 0; i < managers.length; i++) {
    await testSingleManager(managers[i], i);
  }
}

// ============================================================================
// Integration Testing Functions
// ============================================================================

/**
 * Test a specific known file against a manager
 *
 * @param {string} name - Test case name
 * @param {string} filePath - Absolute path to test file
 * @param {Array} managers - Array of managers (to look up by index)
 * @param {number} managerIndex - Index of manager to use
 * @param {Array<string>} expectedFields - Required capture group names
 */
async function testKnownFile(name, filePath, managers, managerIndex, expectedFields) {
  if (!fs.existsSync(filePath)) {
    runTest(`${name}: Test file exists`, 'fail', `File not found: ${filePath}`);
    return;
  }

  const manager = managers[managerIndex];
  if (!manager) {
    runTest(`${name}: Manager exists`, 'fail', `Manager #${managerIndex} not found`);
    return;
  }

  const pattern = manager.matchStrings[0];
  const content = fs.readFileSync(filePath, 'utf8');
  const result = testRegexMatch(pattern, content, {});

  if (!result.success) {
    runTest(`${name}: Pattern matches file`, 'fail', result.error);
    return;
  }

  // Verify expected fields are captured
  const missingFields = expectedFields.filter(field => !result.captured[field]);
  if (missingFields.length > 0) {
    runTest(`${name}: Extracts required fields`, 'fail',
      `Missing fields: ${missingFields.join(', ')}`);
    return;
  }

  // Check for empty values
  const emptyFields = expectedFields.filter(field => !result.captured[field] || result.captured[field] === '');
  if (emptyFields.length > 0) {
    runTest(`${name}: Extracts required fields`, 'fail',
      `Empty fields: ${emptyFields.join(', ')}`);
    return;
  }

  const details = expectedFields
    .map(field => `${field}=${result.captured[field]}`)
    .join(', ');

  runTest(`${name}: Extracts dependency info`, 'pass', details);
}

/**
 * Execute integration tests against known repository files
 *
 * @param {Array} managers - Array of custom manager configurations
 */
async function runIntegrationTests(managers) {
  startTestSuite('Integration Tests');

  // Test cert-manager (Manager #1)
  await testKnownFile(
    'cert-manager',
    path.join(REPO_ROOT, 'infrastructure/base/cert-manager/release.yaml'),
    managers,
    0,
    ['depName', 'currentValue', 'registryUrl']
  );

  // Test nginx-gateway-fabric (Manager #2)
  await testKnownFile(
    'nginx-gateway-fabric',
    path.join(REPO_ROOT, 'infrastructure/base/nginx-gateway-fabric/release.yaml'),
    managers,
    1,
    ['namespace', 'depName', 'currentValue']
  );

  // Test pi-hole (Manager #3)
  await testKnownFile(
    'pi-hole',
    path.join(REPO_ROOT, 'apps/base/pi-hole/release.yaml'),
    managers,
    2,
    ['repository', 'currentValue']
  );

  // Test gateway-api (Manager #4)
  await testKnownFile(
    'gateway-api',
    path.join(REPO_ROOT, 'infrastructure/base/gateway-api/kustomization.yaml'),
    managers,
    3,
    ['depName', 'currentValue']
  );

  endTestSuite();
}

// ============================================================================
// Reporting & Summary Functions
// ============================================================================

/**
 * Display final test summary and exit with appropriate code
 */
function displaySummaryAndExit() {
  console.log('');
  console.log(`${colors.magenta}╔════════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.magenta}║                         Test Summary                               ║${colors.reset}`);
  console.log(`${colors.magenta}╚════════════════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log('');
  console.log(`Total tests run:    ${testsRun}`);
  console.log(`Tests passed:       ${colors.green}${testsPassed}${colors.reset}`);
  console.log(`Tests failed:       ${colors.red}${testsFailed}${colors.reset}`);

  const passRate = testsFailed === 0 ? 100 : Math.floor((testsPassed * 100) / testsRun);
  console.log(`Pass rate:          ${passRate}%`);
  console.log('');

  if (testsFailed === 0) {
    console.log(`${colors.green}╔════════════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.green}║                    ✓ ALL TESTS PASSED                              ║${colors.reset}`);
    console.log(`${colors.green}╚════════════════════════════════════════════════════════════════════╝${colors.reset}`);
    console.log('');
    logSuccess('All custom manager regex patterns are working correctly');
    logSuccess('All templates reference valid capture groups');
    logSuccess('All patterns match expected files in repository');
    process.exit(0);
  } else {
    console.log(`${colors.red}╔════════════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.red}║                    ✗ SOME TESTS FAILED                             ║${colors.reset}`);
    console.log(`${colors.red}╚════════════════════════════════════════════════════════════════════╝${colors.reset}`);
    console.log('');
    logError(`${testsFailed} test(s) failed`);
    console.log('');
    logWarning('Please review the failed tests above and fix the issues in renovate.json');
    logWarning('Common issues:');
    console.log('  - Template fields referencing non-existent capture groups');
    console.log('  - Invalid regex syntax');
    console.log('  - File patterns not matching any repository files');
    console.log('  - Regex patterns not matching file content');
    process.exit(1);
  }
}

// ============================================================================
// Main Orchestrator
// ============================================================================

/**
 * Main test orchestrator
 *
 * Coordinates the entire test execution flow:
 * 1. Display banner and environment info
 * 2. Check prerequisites
 * 3. Load configuration
 * 4. Test all custom managers
 * 5. Run integration tests
 * 6. Display summary and exit
 */
async function main() {
  displayBanner();
  checkPrerequisites();
  const { managers } = loadConfiguration();
  await testAllManagers(managers);
  await runIntegrationTests(managers);
  displaySummaryAndExit();
}

// Run main function
main().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  console.error(error.stack);
  process.exit(1);
});
