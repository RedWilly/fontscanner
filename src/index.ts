/**
 * Cross-platform Node.js library for discovering and searching system fonts
 * @packageDocumentation
 */

// Export all public API functions and types
export {
  getAllFonts,
  findFontByName,
  getFontsByFormat,
  clearFontCache,
  getCachedFontCount,
  isCacheValid,
  type FontEntry,
  type FontScanOptions
} from './fontScanner';
