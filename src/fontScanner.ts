import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

/**
 * Supported font file extensions (modern formats only)
 */
const FONT_EXTENSIONS = new Set([
  '.ttf', '.otf', '.woff', '.woff2', '.ttc', '.fon', '.fnt'
]);

// Font cache for performance
let fontCache: FontEntry[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 300000; // 5 minutes

/**
 * Represents a font entry with its metadata
 */
export interface FontEntry {
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

/**
 * Error information for failed font operations
 */
export interface FontError {
  /** Path to the font file that caused the error */
  path: string;
  /** Error message */
  message: string;
  /** Error code for programmatic handling */
  code: 'FILE_NOT_FOUND' | 'PERMISSION_DENIED' | 'INVALID_FONT' | 'PARSE_ERROR' | 'UNKNOWN';
}

/**
 * Result object for font scanning operations with error reporting
 */
export interface FontScanResult {
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

/**
 * Options for font scanning operations
 */
export interface FontScanOptions {
  /** Whether to use cached results (default: true) */
  useCache?: boolean;
  /** Whether to include system fonts (default: true) */
  includeSystemFonts?: boolean;
  /** Whether to include user fonts (default: true) */
  includeUserFonts?: boolean;
  /** Custom directories to scan */
  customDirs?: string[];
}

/**
 * Chainable FontScanner class for fluent API
 */
export class FontScanner {
  private _options: FontScanOptions = {};
  private _filters: {
    format?: string;
    weight?: number;
    monospaceOnly?: boolean;
    nameSearch?: { query: string; exact: boolean };
  } = {};

  /**
   * Create a new FontScanner instance
   * @param options - Initial scan options
   */
  constructor(options: FontScanOptions = {}) {
    this._options = { ...options };
  }

  /**
   * Static method to start scanning
   * @param options - Font scan options
   * @returns FontScanner instance for chaining
   */
  static scan(options: FontScanOptions = {}): FontScanner {
    return new FontScanner(options);
  }

  /**
   * Filter fonts by format
   * @param format - Font format (ttf, otf, etc.)
   * @returns FontScanner instance for chaining
   */
  filterByFormat(format: string): FontScanner {
    this._filters.format = format.toLowerCase();
    return this;
  }

  /**
   * Filter fonts by weight
   * @param weight - Font weight (100-900)
   * @returns FontScanner instance for chaining
   */
  filterByWeight(weight: number): FontScanner {
    this._filters.weight = weight;
    return this;
  }

  /**
   * Filter to only monospace fonts
   * @returns FontScanner instance for chaining
   */
  onlyMonospace(): FontScanner {
    this._filters.monospaceOnly = true;
    return this;
  }

  /**
   * Search fonts by name (partial match)
   * @param query - Search query
   * @returns FontScanner instance for chaining
   */
  searchByName(query: string): FontScanner {
    this._filters.nameSearch = { query, exact: false };
    return this;
  }

  /**
   * Match font name exactly
   * @param name - Exact font name
   * @returns FontScanner instance for chaining
   */
  matchNameExactly(name: string): FontScanner {
    this._filters.nameSearch = { query: name, exact: true };
    return this;
  }

  /**
   * Get fonts synchronously
   * @returns Array of font entries
   */
  getFonts(): FontEntry[] {
    const allFonts = getAllFontsSync(this._options);
    return this._applyFilters(allFonts);
  }

  /**
   * Get fonts asynchronously
   * @returns Promise resolving to array of font entries
   */
  async getFontsAsync(): Promise<FontEntry[]> {
    const allFonts = await getAllFontsAsync(this._options);
    return this._applyFilters(allFonts);
  }

  /**
   * Get detailed scan result synchronously
   * @returns FontScanResult with fonts, errors, and stats
   */
  getResult(): FontScanResult {
    const result = getAllFontsWithResultSync(this._options);
    result.fonts = this._applyFilters(result.fonts);
    return result;
  }

  /**
   * Get detailed scan result asynchronously
   * @returns Promise resolving to FontScanResult
   */
  async getResultAsync(): Promise<FontScanResult> {
    const result = await getAllFontsWithResultAsync(this._options);
    result.fonts = this._applyFilters(result.fonts);
    return result;
  }

  /**
   * Apply all filters to the font list
   * @param fonts - Array of fonts to filter
   * @returns Filtered array of fonts
   */
  private _applyFilters(fonts: FontEntry[]): FontEntry[] {
    let filtered = fonts;

    // Apply format filter
    if (this._filters.format) {
      filtered = filtered.filter(font => 
        font.format?.toLowerCase() === this._filters.format
      );
    }

    // Apply weight filter
    if (this._filters.weight !== undefined) {
      filtered = filtered.filter(font => font.weight === this._filters.weight);
    }

    // Apply monospace filter
    if (this._filters.monospaceOnly) {
      filtered = filtered.filter(font => font.isMonospace === true);
    }

    // Apply name search filter
    if (this._filters.nameSearch) {
      const { query, exact } = this._filters.nameSearch;
      if (exact) {
        filtered = filtered.filter(font => 
          font.name.toLowerCase() === query.toLowerCase() ||
          font.family?.toLowerCase() === query.toLowerCase()
        );
      } else {
        filtered = filtered.filter(font => 
          font.name.toLowerCase().includes(query.toLowerCase()) ||
          font.family?.toLowerCase().includes(query.toLowerCase())
        );
      }
    }

    return filtered;
  }
}

/**
 * Get platform-specific font directories
 * @param options - Font scan options
 * @returns Array of directory paths to scan for fonts
 */
function getPlatformFontDirs(options: FontScanOptions = {}): string[] {
  const home = os.homedir();
  const platform = process.platform;
  const dirs: string[] = [];

  // Add custom directories first
  if (options.customDirs) {
    dirs.push(...options.customDirs);
  }

  if (platform === 'win32') {
    // Windows font directories
    if (options.includeSystemFonts !== false) {
      dirs.push(path.join(process.env['WINDIR'] || 'C:\\Windows', 'Fonts'));
      
      // Try to get additional font paths from Windows registry
      try {
        const registryFonts = getWindowsRegistryFonts();
        dirs.push(...registryFonts);
      } catch {
        // Ignore registry errors - not critical
      }
    }
    
    if (options.includeUserFonts !== false) {
      dirs.push(path.join(home, 'AppData', 'Local', 'Microsoft', 'Windows', 'Fonts'));
    }
  } else if (platform === 'darwin') {
    // macOS font directories
    if (options.includeSystemFonts !== false) {
      dirs.push(
        '/System/Library/Fonts',
        '/Library/Fonts',
        '/System/Library/Assets/com_apple_MobileAsset_Font6'
      );
    }
    
    if (options.includeUserFonts !== false) {
      dirs.push(path.join(home, 'Library/Fonts'));
    }
  } else {
    // Linux/Unix font directories
    if (options.includeSystemFonts !== false) {
      dirs.push(
        '/usr/share/fonts',
        '/usr/local/share/fonts',
        '/usr/X11R6/lib/X11/fonts'
      );
    }
    
    if (options.includeUserFonts !== false) {
      dirs.push(
        path.join(home, '.fonts'),
        path.join(home, '.local/share/fonts')
      );
    }
  }

  // Remove duplicates and return
  return [...new Set(dirs)];
}

/**
 * Get font directories from Windows registry
 * @returns Array of unique font directory paths
 */
function getWindowsRegistryFonts(): string[] {
  const dirs: string[] = [];
  
  try {
    // Query Windows registry for installed fonts
    const output = execSync(
      'reg query "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts" /s',
      { encoding: 'utf8', timeout: 5000 }
    );
    
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.includes('REG_SZ') && line.includes('\\')) {
        const match = line.match(/REG_SZ\s+(.+\.(?:ttf|otf|ttc))/i);
        if (match) {
          const fontPath = match[1]?.trim();
          if (fontPath && path.isAbsolute(fontPath)) {
            dirs.push(path.dirname(fontPath));
          }
        }
      }
    }
  } catch {
    // Ignore registry errors - not critical
  }
  
  return [...new Set(dirs)];
}

/**
 * Walk directory recursively to find font files (synchronous)
 * @param dir - Directory to walk
 * @param fileList - Array to collect font files
 * @param maxDepth - Maximum recursion depth (default: 3)
 */
function walkDir(dir: string, fileList: string[], maxDepth: number = 3): void {
  if (maxDepth <= 0) return;
  
  try {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const file of files) {
      try {
        const fullPath = path.join(dir, file.name);
        
        if (file.isDirectory()) {
          // Skip common non-font directories
          if (!file.name.startsWith('.') && 
              !['node_modules', 'cache', 'tmp', 'temp'].includes(file.name.toLowerCase())) {
            walkDir(fullPath, fileList, maxDepth - 1);
          }
        } else if (file.isFile()) {
          const ext = path.extname(fullPath).toLowerCase();
          if (FONT_EXTENSIONS.has(ext)) {
            fileList.push(fullPath);
          }
        }
      } catch {
        // Skip files/directories that can't be accessed
        continue;
      }
    }
  } catch {
    // Skip directories that can't be read
  }
}

/**
 * Walk directory recursively to find font files (asynchronous)
 * @param dir - Directory to walk
 * @param fileList - Array to collect font files
 * @param maxDepth - Maximum recursion depth (default: 3)
 */
async function walkDirAsync(dir: string, fileList: string[], maxDepth: number = 3): Promise<void> {
  if (maxDepth <= 0) return;
  
  try {
    const files = await fs.promises.readdir(dir, { withFileTypes: true });
    
    for (const file of files) {
      try {
        const fullPath = path.join(dir, file.name);
        
        if (file.isDirectory()) {
          // Skip common non-font directories
          if (!file.name.startsWith('.') && 
              !['node_modules', 'cache', 'tmp', 'temp'].includes(file.name.toLowerCase())) {
            await walkDirAsync(fullPath, fileList, maxDepth - 1);
          }
        } else if (file.isFile()) {
          const ext = path.extname(fullPath).toLowerCase();
          if (FONT_EXTENSIONS.has(ext)) {
            fileList.push(fullPath);
          }
        }
      } catch {
        // Skip files/directories that can't be accessed
        continue;
      }
    }
  } catch {
    // Skip directories that can't be read
  }
}

/**
 * Read font metadata synchronously with improved parsing
 * @param fontPath - Path to the font file
 * @returns Font metadata or null if extraction fails
 */
function readFontMetadataSync(fontPath: string): Partial<FontEntry> | null {
  try {
    const stats = fs.statSync(fontPath);
    const buffer = fs.readFileSync(fontPath);
    const ext = path.extname(fontPath).toLowerCase();
    
    // Base metadata from file system
    const baseMetadata: Partial<FontEntry> = {
      path: fontPath,
      format: ext.substring(1),
      fileSize: stats.size,
      lastModified: stats.mtime
    };
    
    // Handle different font formats - only parse TTF/OTF properly
    if (['.ttf', '.otf', '.ttc'].includes(ext)) {
      const ttfMetadata = parseTTFOTFFont(buffer);
      if (ttfMetadata && ttfMetadata.name) {
        return { ...baseMetadata, ...ttfMetadata };
      }
    }
    
    // For other formats or failed parsing, use filename as fallback
    const name = path.basename(fontPath, ext);
    return { ...baseMetadata, name, family: name };
  } catch {
    return null;
  }
}

/**
 * Read font metadata asynchronously with improved parsing
 * @param fontPath - Path to the font file
 * @returns Promise resolving to font metadata or null if extraction fails
 */
async function readFontMetadataAsync(fontPath: string): Promise<Partial<FontEntry> | null> {
  try {
    const stats = await fs.promises.stat(fontPath);
    const buffer = await fs.promises.readFile(fontPath);
    const ext = path.extname(fontPath).toLowerCase();
    
    // Base metadata from file system
    const baseMetadata: Partial<FontEntry> = {
      path: fontPath,
      format: ext.substring(1),
      fileSize: stats.size,
      lastModified: stats.mtime
    };
    
    // Handle different font formats - only parse TTF/OTF properly
    if (['.ttf', '.otf', '.ttc'].includes(ext)) {
      const ttfMetadata = parseTTFOTFFont(buffer);
      if (ttfMetadata && ttfMetadata.name) {
        return { ...baseMetadata, ...ttfMetadata };
      }
    }
    
    // For other formats or failed parsing, use filename as fallback
    const name = path.basename(fontPath, ext);
    return { ...baseMetadata, name, family: name };
  } catch {
    return null;
  }
}

/**
 * Parse TTF/OTF font metadata with better error handling
 * @param buffer - Font file buffer
 * @returns Parsed font metadata
 */
function parseTTFOTFFont(buffer: Buffer): Partial<FontEntry> | null {
  try {
    // Ensure buffer has minimum required size
    if (buffer.length < 12) {
      return null;
    }
    
    const metadata: Partial<FontEntry> = {};
    const numTables = buffer.readUInt16BE(4);
    const offset = 12;

    // Parse font tables
    for (let i = 0; i < numTables; i++) {
      const tableOffset = offset + i * 16;
      
      // Ensure we don't read beyond buffer
      if (tableOffset + 16 > buffer.length) {
        break;
      }
      
      const tag = buffer.toString('ascii', tableOffset, tableOffset + 4);
      const tableDataOffset = buffer.readUInt32BE(tableOffset + 8);
      const tableLength = buffer.readUInt32BE(tableOffset + 12);

      if (tag === 'name') {
        const nameData = parseNameTable(buffer, tableDataOffset, tableLength);
        Object.assign(metadata, nameData);
      } else if (tag === 'OS/2') {
        const os2Data = parseOS2Table(buffer, tableDataOffset, tableLength);
        Object.assign(metadata, os2Data);
      } else if (tag === 'post') {
        const postData = parsePostTable(buffer, tableDataOffset, tableLength);
        Object.assign(metadata, postData);
      }
    }
    
    return metadata;
  } catch {
    return null;
  }
}

/**
 * Parse the 'name' table for font names and metadata
 * @param buffer - Font file buffer
 * @param offset - Table offset
 * @param _length - Table length (unused but kept for API consistency)
 * @returns Parsed name data
 */
function parseNameTable(buffer: Buffer, offset: number, _length: number): Partial<FontEntry> {
  const result: Partial<FontEntry> = {};
  
  try {
    if (offset + 6 > buffer.length) return result;
    
    const count = buffer.readUInt16BE(offset + 2);
    const stringOffset = offset + buffer.readUInt16BE(offset + 4);

    for (let j = 0; j < count; j++) {
      const recordOffset = offset + 6 + j * 12;
      
      if (recordOffset + 12 > buffer.length) break;
      
      const nameID = buffer.readUInt16BE(recordOffset + 6);
      const stringLength = buffer.readUInt16BE(recordOffset + 8);
      const stringOffsetInTable = buffer.readUInt16BE(recordOffset + 10);
      const start = stringOffset + stringOffsetInTable;

      if (start + stringLength <= buffer.length) {
        const nameBuf = buffer.slice(start, start + stringLength);
        const nameStr = decodeUtf16BE(nameBuf).replace(/\0/g, '').trim();
        
        if (nameStr) {
          switch (nameID) {
            case 1: // Font family name
              result.family = nameStr;
              break;
            case 4: // Full font name
              result.name = nameStr;
              break;
            case 5: // Version string
              result.version = nameStr;
              break;
            case 0: // Copyright notice
              result.copyright = nameStr;
              break;
          }
        }
      }
    }
  } catch {
    // Ignore parsing errors
  }
  
  return result;
}

/**
 * Parse the 'OS/2' table for weight and style information
 * @param buffer - Font file buffer
 * @param offset - Table offset
 * @param _length - Table length (unused but kept for API consistency)
 * @returns Parsed OS/2 data
 */
function parseOS2Table(buffer: Buffer, offset: number, _length: number): Partial<FontEntry> {
  const result: Partial<FontEntry> = {};
  
  try {
    if (offset + 8 > buffer.length) return result;
    
    // Font weight (offset 4)
    const weight = buffer.readUInt16BE(offset + 4);
    result.weight = weight;
    
    // Font selection flags (offset 62)
    if (offset + 64 <= buffer.length) {
      const fsSelection = buffer.readUInt16BE(offset + 62);
      
      // Bit 0: Italic
      if (fsSelection & 0x01) {
        result.style = 'italic';
      } else {
        result.style = 'normal';
      }
    }
    
    // Check if font is monospaced (panose data at offset 32)
    if (offset + 42 <= buffer.length) {
      const panoseData = buffer.slice(offset + 32, offset + 42);
      // Panose byte 3 indicates proportion (9 = monospaced)
      if (panoseData[3] === 9) {
        result.isMonospace = true;
      }
    }
  } catch {
    // Ignore parsing errors
  }
  
  return result;
}

/**
 * Parse the 'post' table for additional font information
 * @param buffer - Font file buffer
 * @param offset - Table offset
 * @param _length - Table length (unused but kept for API consistency)
 * @returns Parsed post table data
 */
function parsePostTable(buffer: Buffer, offset: number, _length: number): Partial<FontEntry> {
  const result: Partial<FontEntry> = {};
  
  try {
    if (offset + 32 > buffer.length) return result;
    
    // Check if font is monospaced (isFixedPitch at offset 12)
    const isFixedPitch = buffer.readUInt32BE(offset + 12);
    if (isFixedPitch !== 0) {
      result.isMonospace = true;
    }
  } catch {
    // Ignore parsing errors
  }
  
  return result;
}

/**
 * Decode UTF-16 Big Endian buffer to string
 * @param buffer - Buffer containing UTF-16 BE encoded text
 * @returns Decoded string
 */
function decodeUtf16BE(buffer: Buffer): string {
  let result = '';
  
  // UTF-16 BE uses 2 bytes per character
  for (let i = 0; i < buffer.length - 1; i += 2) {
    const byte1 = buffer[i];
    const byte2 = buffer[i + 1];
    if (byte1 !== undefined && byte2 !== undefined) {
      const charCode = (byte1 << 8) | byte2;
      if (charCode !== 0) { // Skip null characters
        result += String.fromCharCode(charCode);
      }
    }
  }
  
  return result;
}

/**
 * Get all fonts available on the system (synchronous)
 * @param options - Font scan options
 * @returns Array of font entries
 */
function getAllFontsSync(options: FontScanOptions = {}): FontEntry[] {
  const result = getAllFontsWithResultSync(options);
  return result.fonts;
}

/**
 * Get all fonts available on the system with detailed results (synchronous)
 * @param options - Font scanning options
 * @returns Font scan result with fonts, errors, and statistics
 */
function getAllFontsWithResultSync(options: FontScanOptions = {}): FontScanResult {
  const startTime = Date.now();
  const now = Date.now();
  
  // Check cache if enabled
  if (options.useCache !== false && fontCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return {
      fonts: fontCache,
      errors: [],
      stats: {
        directoriesScanned: 0,
        filesProcessed: fontCache.length,
        fontsFound: fontCache.length,
        filesFailed: 0,
        scanTimeMs: Date.now() - startTime
      }
    };
  }
  
  const fontDirs = getPlatformFontDirs(options);
  const fontFiles: string[] = [];
  let directoriesScanned = 0;

  fontDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      walkDir(dir, fontFiles);
      directoriesScanned++;
    }
  });

  const fonts: FontEntry[] = [];
  const errors: FontError[] = [];
  let filesProcessed = 0;
  let filesFailed = 0;

  for (const file of fontFiles) {
    filesProcessed++;
    try {
      const metadata = readFontMetadataSync(file);
      if (metadata && metadata.name) {
        fonts.push(metadata as FontEntry);
      } else {
        filesFailed++;
        errors.push({
          path: file,
          message: 'Failed to extract font metadata',
          code: 'PARSE_ERROR'
        });
      }
    } catch (error) {
      filesFailed++;
      errors.push({
        path: file,
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'PARSE_ERROR'
      });
    }
  }

  // Update cache
  if (options.useCache !== false) {
    fontCache = fonts;
    cacheTimestamp = now;
  }

  return {
    fonts,
    errors,
    stats: {
      directoriesScanned,
      filesProcessed,
      fontsFound: fonts.length,
      filesFailed,
      scanTimeMs: Date.now() - startTime
    }
  };
}

/**
 * Get all fonts available on the system (asynchronous)
 * @param options - Font scanning options
 * @returns Promise resolving to array of font entries
 */
async function getAllFontsAsync(options: FontScanOptions = {}): Promise<FontEntry[]> {
  const result = await getAllFontsWithResultAsync(options);
  return result.fonts;
}

/**
 * Get all fonts available on the system with detailed results (asynchronous)
 * @param options - Font scanning options
 * @returns Promise resolving to font scan result with fonts, errors, and statistics
 */
async function getAllFontsWithResultAsync(options: FontScanOptions = {}): Promise<FontScanResult> {
  const startTime = Date.now();
  const now = Date.now();
  
  // Check cache if enabled
  if (options.useCache !== false && fontCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return {
      fonts: fontCache,
      errors: [],
      stats: {
        directoriesScanned: 0,
        filesProcessed: fontCache.length,
        fontsFound: fontCache.length,
        filesFailed: 0,
        scanTimeMs: Date.now() - startTime
      }
    };
  }
  
  const fontDirs = getPlatformFontDirs(options);
  const fontFiles: string[] = [];
  let directoriesScanned = 0;

  // Async directory walking
  for (const dir of fontDirs) {
    try {
      await fs.promises.access(dir);
      await walkDirAsync(dir, fontFiles);
      directoriesScanned++;
    } catch {
      // Directory doesn't exist or no permission
    }
  }

  const fonts: FontEntry[] = [];
  const errors: FontError[] = [];
  let filesProcessed = 0;
  let filesFailed = 0;

  // Process fonts in batches to avoid overwhelming the system
  const batchSize = 50;
  for (let i = 0; i < fontFiles.length; i += batchSize) {
    const batch = fontFiles.slice(i, i + batchSize);
    const batchPromises = batch.map(async (file) => {
      filesProcessed++;
      try {
        const metadata = await readFontMetadataAsync(file);
        if (metadata && metadata.name) {
          return { success: true, font: metadata as FontEntry };
        } else {
          return {
            success: false,
            error: {
              path: file,
              message: 'Failed to extract font metadata',
              code: 'PARSE_ERROR' as const
            }
          };
        }
      } catch (error) {
        return {
          success: false,
          error: {
            path: file,
            message: error instanceof Error ? error.message : 'Unknown error',
            code: 'PARSE_ERROR' as const
          }
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    for (const result of batchResults) {
      if (result.success && result.font) {
        fonts.push(result.font);
      } else if (!result.success && result.error) {
        filesFailed++;
        errors.push(result.error);
      }
    }
  }

  // Update cache
  if (options.useCache !== false) {
    fontCache = fonts;
    cacheTimestamp = now;
  }

  return {
    fonts,
    errors,
    stats: {
      directoriesScanned,
      filesProcessed,
      fontsFound: fonts.length,
      filesFailed,
      scanTimeMs: Date.now() - startTime
    }
  };
}

/**
 * Clear the font cache to force a fresh scan
 */
export function clearFontCache(): void {
  fontCache = null;
  cacheTimestamp = 0;
}

/**
 * Get the number of cached fonts
 * @returns Number of fonts in cache
 */
export function getCachedFontCount(): number {
  return fontCache?.length || 0;
}

/**
 * Check if the current cache is valid
 * @returns true if cache exists and is not expired
 */
export function isCacheValid(): boolean {
  return fontCache !== null && (Date.now() - cacheTimestamp) < CACHE_DURATION;
}
