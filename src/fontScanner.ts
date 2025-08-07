import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

// Supported font extensions
const FONT_EXTENSIONS = ['.ttf', '.otf', '.woff', '.woff2', '.eot', '.ttc'];

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
    // Registry query failed - not critical
  }
  
  return [...new Set(dirs)];
}

function walkDir(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;

  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    try {
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walkDir(fullPath, fileList);
      } else if (FONT_EXTENSIONS.includes(path.extname(fullPath).toLowerCase())) {
        fileList.push(fullPath);
      }
    } catch {
      continue;
    }
  }

  return fileList;
}

/**
 * Extract font name from TTF/OTF font file
 * @param fontPath - Path to the font file
 * @returns Font name or null if extraction fails
 */
function readFontNameSync(fontPath: string): string | null {
  try {
    const buffer = fs.readFileSync(fontPath);
    
    // Ensure buffer has minimum required size
    if (buffer.length < 12) {
      return null;
    }
    
    const numTables = buffer.readUInt16BE(4);
    const offset = 12;

    for (let i = 0; i < numTables; i++) {
      const tableOffset = offset + i * 16;
      
      // Ensure we don't read beyond buffer
      if (tableOffset + 16 > buffer.length) {
        break;
      }
      
      const tag = buffer.toString('ascii', tableOffset, tableOffset + 4);

      if (tag === 'name') {
        const nameTableOffset = buffer.readUInt32BE(tableOffset + 8);
        
        // Ensure name table offset is valid
        if (nameTableOffset + 6 > buffer.length) {
          break;
        }
        
        const count = buffer.readUInt16BE(nameTableOffset + 2);
        const stringOffset = nameTableOffset + buffer.readUInt16BE(nameTableOffset + 4);

        for (let j = 0; j < count; j++) {
          const recordOffset = nameTableOffset + 6 + j * 12;
          
          // Ensure record offset is valid
          if (recordOffset + 12 > buffer.length) {
            break;
          }
          
          const nameID = buffer.readUInt16BE(recordOffset + 6);

          if (nameID === 4) { // Font full name
            const length = buffer.readUInt16BE(recordOffset + 8);
            const offsetStr = buffer.readUInt16BE(recordOffset + 10);
            const start = stringOffset + offsetStr;

            // Ensure string bounds are valid
            if (start + length <= buffer.length) {
              const nameBuf = buffer.slice(start, start + length);
              const name = decodeUtf16BE(nameBuf).replace(/\0/g, '').trim();
              if (name) {
                return name;
              }
            }
          }
        }
      }
    }
  } catch {
    // Return filename as fallback
    const basename = path.basename(fontPath);
    const nameWithoutExt = basename.substring(0, basename.lastIndexOf('.'));
    return nameWithoutExt || null;
  }

  return null;
}

/**
 * Get all fonts available on the system
 * @param options - Font scanning options
 * @returns Array of font entries
 */
export function getAllFonts(options: FontScanOptions = {}): FontEntry[] {
  const now = Date.now();
  
  // Check cache if enabled
  if (options.useCache !== false && fontCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return fontCache;
  }
  
  const fontDirs = getPlatformFontDirs(options);
  const fontFiles: string[] = [];

  fontDirs.forEach(dir => {
    walkDir(dir, fontFiles);
  });

  const fonts: FontEntry[] = [];
  for (const file of fontFiles) {
    const name = readFontNameSync(file);
    if (name) {
      const ext = path.extname(file).toLowerCase();
      fonts.push({ 
        name, 
        path: file,
        format: ext.substring(1) // Remove the dot
      });
    }
  }

  // Update cache
  if (options.useCache !== false) {
    fontCache = fonts;
    cacheTimestamp = now;
  }

  return fonts;
}

/**
 * Find a font by name (case-insensitive)
 * @param query - Font name to search for
 * @param options - Font scanning options
 * @returns Font entry if found, null otherwise
 */
export function findFontByName(query: string, options: FontScanOptions = {}): FontEntry | null {
  const fonts = getAllFonts(options);
  const normalizedQuery = query.toLowerCase().trim();
  
  // Try exact match first
  let found = fonts.find(f => f.name.toLowerCase() === normalizedQuery);
  
  // If no exact match, try partial match
  if (!found) {
    found = fonts.find(f => f.name.toLowerCase().includes(normalizedQuery));
  }
  
  return found || null;
}

/**
 * Clear the font cache to force a fresh scan on next call
 */
export function clearFontCache(): void {
  fontCache = null;
  cacheTimestamp = 0;
}

/**
 * Get the number of cached fonts (if cache exists)
 * @returns Number of cached fonts or 0 if no cache
 */
export function getCachedFontCount(): number {
  return fontCache?.length || 0;
}

/**
 * Check if the font cache is valid
 * @returns True if cache exists and is not expired
 */
export function isCacheValid(): boolean {
  if (!fontCache) return false;
  const now = Date.now();
  return (now - cacheTimestamp) < CACHE_DURATION;
}

/**
 * Get fonts by format
 * @param format - Font format to filter by (e.g., 'ttf', 'otf')
 * @param options - Font scanning options
 * @returns Array of fonts matching the specified format
 */
export function getFontsByFormat(format: string, options: FontScanOptions = {}): FontEntry[] {
  const fonts = getAllFonts(options);
  const normalizedFormat = format.toLowerCase();
  return fonts.filter(f => f.format === normalizedFormat);
}
