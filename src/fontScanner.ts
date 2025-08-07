import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const FONT_EXTENSIONS = ['.ttf', '.otf'];

export interface FontEntry {
  name: string;
  path: string;
}

function getPlatformFontDirs(): string[] {
  const home = os.homedir();
  const platform = process.platform;

  if (platform === 'win32') {
    return [path.join(process.env['WINDIR'] || 'C:\\Windows', 'Fonts')];
  }

  if (platform === 'darwin') {
    return [
      '/System/Library/Fonts',
      '/Library/Fonts',
      path.join(home, 'Library/Fonts'),
    ];
  }

  return [
    '/usr/share/fonts',
    '/usr/local/share/fonts',
    path.join(home, '.fonts'),
    path.join(home, '.local/share/fonts'),
  ];
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

function readFontNameSync(fontPath: string): string | null {
  try {
    const buffer = fs.readFileSync(fontPath);
    const numTables = buffer.readUInt16BE(4);
    const offset = 12;

    for (let i = 0; i < numTables; i++) {
      const tableOffset = offset + i * 16;
      const tag = buffer.toString('ascii', tableOffset, tableOffset + 4);

      if (tag === 'name') {
        const nameTableOffset = buffer.readUInt32BE(tableOffset + 8);
        const count = buffer.readUInt16BE(nameTableOffset + 2);
        const stringOffset = nameTableOffset + buffer.readUInt16BE(nameTableOffset + 4);

        for (let j = 0; j < count; j++) {
          const recordOffset = nameTableOffset + 6 + j * 12;
          const nameID = buffer.readUInt16BE(recordOffset + 6);

          if (nameID === 4) {
            const length = buffer.readUInt16BE(recordOffset + 8);
            const offsetStr = buffer.readUInt16BE(recordOffset + 10);
            const start = stringOffset + offsetStr;

            const nameBuf = buffer.slice(start, start + length);
            const name = nameBuf.toString('utf16be').replace(/\0/g, '').trim();
            return name;
          }
        }
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function getAllFonts(): FontEntry[] {
  const fontDirs = getPlatformFontDirs();
  const fontFiles: string[] = [];

  fontDirs.forEach(dir => {
    walkDir(dir, fontFiles);
  });

  const fonts: FontEntry[] = [];
  for (const file of fontFiles) {
    const name = readFontNameSync(file);
    if (name) {
      fonts.push({ name, path: file });
    }
  }

  return fonts;
}

export function findFontByName(query: string): FontEntry | null {
  const fonts = getAllFonts();
  return fonts.find(f => f.name.toLowerCase() === query.toLowerCase()) || null;
}
