# Font Scanner

> Cross-platform Node.js library for discovering and searching system fonts

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-16.0+-green.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🌍 **Cross-platform**: Works on Windows, macOS, and Linux
- ⚡ **Fast**: Built-in caching for improved performance
- 🔍 **Smart search**: Find fonts by name with exact and partial matching
- 📁 **Flexible**: Support for system fonts, user fonts, and custom directories
- 🎯 **Type-safe**: Full TypeScript support with comprehensive type definitions
- 📊 **Format support**: TTF, OTF, WOFF, WOFF2, EOT, TTC font formats
- 🛠️ **Configurable**: Extensive options for customizing font discovery

## Installation

```bash
# Using bun (recommended)
bun add @redwilly/font-scanner

# Using npm
npm install @redwilly/font-scanner

# Using yarn
yarn add @redwilly/font-scanner
```

## Quick Start

```typescript
import { getAllFonts, findFontByName } from '@redwilly/font-scanner';

// Get all fonts on the system
const fonts = getAllFonts();
console.log(`Found ${fonts.length} fonts`);

// Search for a specific font
const arial = findFontByName('Arial');
if (arial) {
  console.log(`Arial found at: ${arial.path}`);
}
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
```

### Functions

#### `getAllFonts(options?: FontScanOptions): FontEntry[]`

Retrieve all fonts available on the system.

```typescript
import { getAllFonts } from '@redwilly/font-scanner';

// Get all fonts (uses cache by default)
const allFonts = getAllFonts();

// Get only system fonts, skip cache
const systemFonts = getAllFonts({
  includeUserFonts: false,
  useCache: false
});

// Scan custom directories
const customFonts = getAllFonts({
  customDirs: ['/path/to/custom/fonts']
});
```

#### `findFontByName(query: string, options?: FontScanOptions): FontEntry | null`

Find a font by name (case-insensitive). Supports both exact and partial matching.

```typescript
import { findFontByName } from '@redwilly/font-scanner';

// Exact match
const arial = findFontByName('Arial');

// Partial match (if exact match fails)
const helvetica = findFontByName('Helv'); // Might find "Helvetica"

// With options
const font = findFontByName('Times', {
  includeUserFonts: false
});
```

#### `getFontsByFormat(format: string, options?: FontScanOptions): FontEntry[]`

Get all fonts of a specific format.

```typescript
import { getFontsByFormat } from '@redwilly/font-scanner';

// Get all TTF fonts
const ttfFonts = getFontsByFormat('ttf');

// Get all OTF fonts from system only
const otfFonts = getFontsByFormat('otf', {
  includeUserFonts: false
});
```

#### `clearFontCache(): void`

Clear the font cache to force a fresh scan on the next call.

```typescript
import { clearFontCache, getAllFonts } from '@redwilly/font-scanner';

// Clear cache and get fresh results
clearFontCache();
const freshFonts = getAllFonts();
```

#### `getCachedFontCount(): number`

Get the number of fonts currently in cache.

```typescript
import { getCachedFontCount } from '@redwilly/font-scanner';

const count = getCachedFontCount();
console.log(`${count} fonts in cache`);
```

#### `isCacheValid(): boolean`

Check if the current cache is valid (exists and not expired).

```typescript
import { isCacheValid } from '@redwilly/font-scanner';

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
import { getAllFonts, findFontByName } from '@redwilly/font-scanner';

// List all fonts
const fonts = getAllFonts();
fonts.forEach(font => {
  console.log(`${font.name} (${font.format}) - ${font.path}`);
});

// Find specific fonts
const commonFonts = ['Arial', 'Times New Roman', 'Helvetica', 'Calibri'];
for (const fontName of commonFonts) {
  const font = findFontByName(fontName);
  if (font) {
    console.log(`✓ ${fontName}: ${font.path}`);
  } else {
    console.log(`✗ ${fontName}: Not found`);
  }
}
```

### Performance Optimization

```typescript
import { getAllFonts, isCacheValid, clearFontCache } from '@redwilly/font-scanner';

// Check cache before scanning
if (!isCacheValid()) {
  console.log('Cache expired, scanning fonts...');
}

const startTime = Date.now();
const fonts = getAllFonts();
const scanTime = Date.now() - startTime;

console.log(`Found ${fonts.length} fonts in ${scanTime}ms`);

// Force refresh if needed
if (needsFreshData) {
  clearFontCache();
  const freshFonts = getAllFonts();
}
```

### Custom Font Directories

```typescript
import { getAllFonts } from '@redwilly/font-scanner';

// Scan additional directories
const fonts = getAllFonts({
  customDirs: [
    '/opt/fonts',
    '/home/user/custom-fonts',
    'C:\\MyFonts'
  ],
  includeSystemFonts: true,
  includeUserFonts: true
});
```

### Filter by Format

```typescript
import { getFontsByFormat, getAllFonts } from '@redwilly/font-scanner';

// Get fonts by specific formats
const ttfFonts = getFontsByFormat('ttf');
const otfFonts = getFontsByFormat('otf');
const webFonts = getFontsByFormat('woff');

// Count fonts by format
const allFonts = getAllFonts();
const formatCounts = allFonts.reduce((acc, font) => {
  const format = font.format || 'unknown';
  acc[format] = (acc[format] || 0) + 1;
  return acc;
}, {} as Record<string, number>);

console.log('Fonts by format:', formatCounts);
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
cd font-scanner

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
