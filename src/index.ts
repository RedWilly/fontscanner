/**
 * Cross-platform Node.js library for discovering and searching system fonts
 * @packageDocumentation
 */

// Export the new chainable FontScanner API and types
export {
  FontScanner,
  clearFontCache,
  getCachedFontCount,
  isCacheValid
} from './fontScanner';

export type {
  FontEntry,
  FontScanOptions,
  FontError,
  FontScanResult
} from './fontScanner';

// Re-export FontScanner as default for convenience
export { FontScanner as default } from './fontScanner';
