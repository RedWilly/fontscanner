import { getAllFonts, findFontByName } from './fontScanner';

const allFonts = getAllFonts();
console.log(`Found ${allFonts.length} fonts`);
allFonts.slice(0, 10).forEach(f => {
  console.log(`${f.name}: ${f.path}`);
});

const searchName = 'Arial';
const found = findFontByName(searchName);

if (found) {
  console.log(`\n"${searchName}" found at: ${found.path}`);
} else {
  console.log(`\n"${searchName}" not found.`);
}
