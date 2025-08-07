# Font Scanner

> Cross-platform Node.js library for discovering and searching system fonts

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-16.0+-green.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🌍 **Cross-platform**: Works on Windows, macOS, and Linux
- ⚡ **Fast**: Built-in caching for improved performance with async support
- 🔍 **Smart search**: Find fonts by name with exact and partial matching
- 📁 **Flexible**: Support for system fonts, user fonts, and custom directories
- 🎯 **Type-safe**: Full TypeScript support with comprehensive type definitions
- 📊 **Format support**: TTF, OTF, WOFF, WOFF2, EOT, TTC, PostScript, Bitmap fonts
- 🛠️ **Configurable**: Extensive options for customizing font discovery
- 🔄 **Async/Sync**: Both synchronous and asynchronous APIs available
- 📈 **Rich metadata**: Extract font family, weight, style, version, and more
- 🚨 **Error reporting**: Comprehensive error tracking and statistics
- 👨‍💻 **Developer-friendly**: Detailed scan results and performance metrics

## Installation

```bash
# Using bun (recommended)
bun add @redwilly/fontscanner

# Using npm
npm install @redwilly/fontscanner

# Using yarn
yarn add @redwilly/fontscanner
```

## Quick Start

```typescript
import FontScanner from '@redwilly/fontscanner';

// Simple usage - get all fonts
const fonts = FontScanner.scan().getFonts();
console.log(`Found ${fonts.length} fonts`);

// Chainable API - filter and search
const boldTtfFonts = FontScanner
  .scan({ useCache: false })
  .filterByFormat('ttf')
  .filterByWeight(700)
  .getFonts();

// Search for specific fonts
const arialFonts = FontScanner
  .scan()
  .searchByName('Arial')
  .getFonts();

// Get only monospace fonts
const monoFonts = FontScanner
  .scan()
  .onlyMonospace()
  .getFonts();

// Async usage (same API)
const asyncFonts = await FontScanner
  .scan()
  .filterByFormat('otf')
  .getFontsAsync();
```

## API Reference

### Types

#### `FontEntry`

Represents a font with its metadata.

```typescript
interface FontEntry {
  /** The display name of the font family */
  name: string;
  /** The full file system path to the font file */
  path: string;
  /** The font file format (ttf, otf, etc.) */
  format?: string;
  /** Font family name (e.g., 'Arial', 'Times New Roman') */
  family?: string;
  /** Font weight (100-900, where 400 is normal, 700 is bold) */
  weight?: number;
  /** Font style */
  style?: 'normal' | 'italic' | 'oblique';
  /** Font version string */
  version?: string;
  /** Copyright information */
  copyright?: string;
  /** Whether the font is monospaced */
  isMonospace?: boolean;
  /** Font file size in bytes */
  fileSize?: number;
  /** Last modified timestamp */
  lastModified?: Date;
}
```

#### `FontScanOptions`

Options for customizing font scanning behavior.

```typescript
interface FontScanOptions {
  /** Whether to use cached results (default: true) */
  useCache?: boolean;
  /** Whether to include system fonts (default: true) */
  includeSystemFonts?: boolean;
  /** Whether to include user fonts (default: true) */
  includeUserFonts?: boolean;
  /** Custom directories to scan */
  customDirs?: string[];
}

interface FontError {
  /** Path to the font file that caused the error */
  path: string;
  /** Error message */
  message: string;
  /** Error code for programmatic handling */
  code: 'FILE_NOT_FOUND' | 'PERMISSION_DENIED' | 'INVALID_FONT' | 'PARSE_ERROR' | 'UNKNOWN';
}

interface FontScanResult {
  /** Successfully parsed fonts */
  fonts: FontEntry[];
  /** Errors encountered during scanning */
  errors: FontError[];
  /** Scan statistics */
  stats: {
    /** Total directories scanned */
    directoriesScanned: number;
    /** Total files processed */
    filesProcessed: number;
    /** Successfully parsed fonts */
    fontsFound: number;
    /** Files that failed to parse */
    filesFailed: number;
    /** Total scan time in milliseconds */
    scanTimeMs: number;
  };
}
```

### FontScanner Class

The main `FontScanner` class provides a fluent, chainable API for font discovery and filtering.

#### `FontScanner.scan(options?: FontScanOptions): FontScanner`

Static method to create a new FontScanner instance.

```typescript
import FontScanner from '@redwilly/fontscanner';

// Basic usage
const scanner = FontScanner.scan();

// With options
const scanner = FontScanner.scan({
  useCache: false,
  includeUserFonts: true,
  customDirs: ['/path/to/fonts']
});
```

#### Chainable Filter Methods

All filter methods return the FontScanner instance for chaining:

```typescript
// Filter by font format
scanner.filterByFormat('ttf')

// Filter by font weight (100-900)
scanner.filterByWeight(700)

// Filter to only monospace fonts
scanner.onlyMonospace()

// Search by name (partial match)
scanner.searchByName('Arial')

// Match font name exactly
scanner.matchNameExactly('Courier New')
```

#### Result Methods

Get the final results after applying filters:

```typescript
// Get fonts synchronously
const fonts: FontEntry[] = scanner.getFonts();

// Get fonts asynchronously
const fonts: FontEntry[] = await scanner.getFontsAsync();

// Get detailed results with error reporting (sync)
const result: FontScanResult = scanner.getResult();

// Get detailed results with error reporting (async)
const result: FontScanResult = await scanner.getResultAsync();
```

#### Complete Examples

```typescript
import FontScanner from '@redwilly/fontscanner';

// Example 1: Find all bold TTF fonts
const boldTtfFonts = FontScanner
  .scan({ useCache: false })
  .filterByFormat('ttf')
  .filterByWeight(700)
  .getFonts();

// Example 2: Search for Arial variants
const arialFonts = FontScanner
  .scan()
  .searchByName('Arial')
  .getFonts();

// Example 3: Get monospace fonts with error details
const result = FontScanner
  .scan()
  .onlyMonospace()
  .getResult();

console.log(`Found ${result.fonts.length} monospace fonts`);
console.log(`${result.errors.length} errors occurred`);

// Example 4: Async usage with multiple filters
const specificFonts = await FontScanner
  .scan({ includeUserFonts: false })
  .filterByFormat('otf')
  .filterByWeight(400)
  .searchByName('Times')
  .getFontsAsync();
```

#### `clearFontCache(): void`

```
import { clearFontCache } from '@redwilly/fontscanner';

// Clear cache
clearFontCache();
```

#### `getCachedFontCount(): number`

Get the number of fonts currently in cache.

```typescript
import { getCachedFontCount } from '@redwilly/fontscanner';

const count = getCachedFontCount();
console.log(`${count} fonts in cache`);
```

#### `isCacheValid(): boolean`

Check if the current cache is valid (exists and not expired).

```typescript
import { isCacheValid } from '@redwilly/fontscanner';

if (isCacheValid()) {
  console.log('Cache is valid');
} else {
  console.log('Cache is invalid or expired');
}
```

## Platform Support

### Windows
- System fonts: `C:\Windows\Fonts`
- User fonts: `%LOCALAPPDATA%\Microsoft\Windows\Fonts`
- Registry-based font discovery for additional locations

### macOS
- System fonts: `/System/Library/Fonts`, `/Library/Fonts`
- User fonts: `~/Library/Fonts`
- Asset catalog fonts: `/System/Library/Assets/com_apple_MobileAsset_Font6`

### Linux
- System fonts: `/usr/share/fonts`, `/usr/local/share/fonts`
- User fonts: `~/.fonts`, `~/.local/share/fonts`
- X11 fonts: `/usr/X11R6/lib/X11/fonts`

## Examples

### Basic Usage

```typescript
import FontScanner from '@redwilly/fontscanner';

// List all fonts
const fonts = FontScanner.scan().getFonts();
fonts.forEach(font => {
  console.log(`${font.name} (${font.format}) - ${font.path}`);
});

// Find specific fonts
const commonFonts = ['Arial', 'Times New Roman', 'Helvetica', 'Calibri'];
for (const fontName of commonFonts) {
  const matchingFonts = FontScanner
    .scan()
    .matchNameExactly(fontName)
    .getFonts();
  
  if (matchingFonts.length > 0 && matchingFonts[0]) {
    console.log(`✓ ${fontName}: ${matchingFonts[0].path}`);
  } else {
    console.log(`✗ ${fontName}: Not found`);
  }
}
```

### Performance Optimization

```typescript
import FontScanner, { isCacheValid, clearFontCache } from '@redwilly/fontscanner';

// Check cache before scanning
if (!isCacheValid()) {
  console.log('Cache expired, scanning fonts...');
}

const startTime = Date.now();
const fonts = FontScanner.scan().getFonts();
const scanTime = Date.now() - startTime;

console.log(`Found ${fonts.length} fonts in ${scanTime}ms`);

// Example: Force refresh when needed
const needsFreshData = fonts.length === 0; // Example condition
if (needsFreshData) {
  console.log('Refreshing font cache...');
  clearFontCache();
  const freshFonts = FontScanner.scan({ useCache: false }).getFonts();
  console.log(`Found ${freshFonts.length} fonts after refresh`);
}
```

### Custom Font Directories

```typescript
import FontScanner from '@redwilly/fontscanner';

// Scan additional directories
const fonts = FontScanner.scan({
  customDirs: [
    '/opt/fonts',
    '/home/user/custom-fonts',
    'C:\\MyFonts'
  ],
  includeSystemFonts: true,
  includeUserFonts: true
}).getFonts();
```

### Filter by Format

```typescript
import FontScanner from '@redwilly/fontscanner';

// Get and display fonts by specific formats
const ttfFonts = FontScanner.scan().filterByFormat('ttf').getFonts();
const otfFonts = FontScanner.scan().filterByFormat('otf').getFonts();
const webFonts = FontScanner.scan().filterByFormat('woff').getFonts();

console.log(`TTF fonts: ${ttfFonts.length}`);
console.log(`OTF fonts: ${otfFonts.length}`);
console.log(`WOFF fonts: ${webFonts.length}`);

// Count all fonts by format
const allFonts = FontScanner.scan().getFonts();
const formatCounts = allFonts.reduce((acc, font) => {
  const format = font.format || 'unknown';
  acc[format] = (acc[format] || 0) + 1;
  return acc;
}, {} as Record<string, number>);

console.log('All fonts by format:', formatCounts);
```

## Performance Notes

- **Caching**: Results are cached for 5 minutes by default to improve performance
- **Lazy Loading**: Fonts are only parsed when accessed
- **Memory Efficient**: Uses streaming for large font directories
- **Error Handling**: Gracefully handles corrupted or inaccessible font files

## Requirements

- Node.js 16.0 or higher
- TypeScript 5.0 or higher (for development)
- Bun runtime (recommended) or Node.js

## Development

```bash
# Clone the repository
git clone <repository-url>
cd fontscanner

# Install dependencies
bun install

# Run development version
bun run dev

# Build the library
bun run build

# Run tests
bun run test
```

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Changelog

### 1.0.0
- Initial release
- Cross-platform font discovery
- Caching support
- TypeScript definitions
- Comprehensive API
