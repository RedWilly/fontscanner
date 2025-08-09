// import { FontScanner } from '../src/fontScanner';

// // Simple usage - get all fonts
// const fonts = FontScanner.scan().getFonts();
// console.log(`Found ${fonts.length} fonts`);

// // Chainable API - filter and search
// const boldTtfFonts = FontScanner
//   .scan({ useCache: false })
//   .filterByFormat('ttf')
//   .filterByWeight(700)
//   .getFonts();

// // console.log(`Found ${boldTtfFonts.length} bold TTF fonts`, boldTtfFonts);
// console.log(`Found ${boldTtfFonts.length} bold TTF fonts`);

// // Search for specific fonts
// const arialFonts = FontScanner
//   .scan()
//   .searchByName('Arial')
//   .getFonts();

// console.log(`Found ${arialFonts.length} Arial fonts`, arialFonts);

// // Get only monospace fonts
// const monoFonts = FontScanner
//   .scan()
//   .onlyMonospace()
//   .getFonts();

// console.log(`Found ${monoFonts.length} monospace fonts`);

// // Async usage (same API)
// const asyncFonts = await FontScanner
//   .scan()
//   .filterByFormat('otf')
//   .getFontsAsync();

// console.log(`Found ${asyncFonts.length} OTF fonts`);


import FontScanner from '../src';

// List all fonts
const fonts = FontScanner.scan().getFonts();
fonts.forEach(font => {
  console.log(`${font.name} (${font.format}) - ${font.path}`);
});

// Find specific fonts
const commonFonts = ['Arial'];
for (const fontName of commonFonts) {
  const matchingFonts = FontScanner
    .scan()
    .matchNameExactly(fontName)
    .getFonts();
  
  if (matchingFonts.length > 0) {
    console.log(`✓ ${fontName}: ${matchingFonts[0].path}`);
  } else {
    console.log(`✗ ${fontName}: Not found`);
  }
}

// import FontScanner, { isCacheValid, clearFontCache } from '../src';

// // Check cache before scanning
// if (!isCacheValid()) {
//   console.log('Cache expired, scanning fonts...');
// }

// const startTime = Date.now();
// const fonts = FontScanner.scan().getFonts();
// const scanTime = Date.now() - startTime;

// console.log(`Found ${fonts.length} fonts in ${scanTime}ms`);

// // Force refresh if needed
// if (true) {
//   clearFontCache();
//   const freshFonts = FontScanner.scan({ useCache: false }).getFonts();
//   console.log(`Found ${freshFonts.length} fonts in ${scanTime}ms`);
// }


// import FontScanner from '../src';

// // Scan additional directories
// const fonts = FontScanner.scan({
//   customDirs: [
//     '/opt/fonts',
//     '/home/user/custom-fonts',
//     'C:\\MyFonts'
//   ],
//   includeSystemFonts: true,
//   includeUserFonts: true
// }).getFonts();

// console.log(fonts);

// import FontScanner from '../src';

// // Get fonts by specific formats using chainable API
// const ttfFonts = FontScanner.scan().filterByFormat('ttf').getFonts();
// const otfFonts = FontScanner.scan().filterByFormat('otf').getFonts();
// const webFonts = FontScanner.scan().filterByFormat('woff').getFonts();

// // Count fonts by format
// const allFonts = FontScanner.scan().getFonts();
// const formatCounts = allFonts.reduce((acc, font) => {
//   const format = font.format || 'unknown';
//   acc[format] = (acc[format] || 0) + 1;
//   return acc;
// }, {} as Record<string, number>);

// console.log('Fonts by format:', formatCounts);