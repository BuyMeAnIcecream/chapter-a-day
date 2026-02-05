import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '../public');
const svgPath = join(publicDir, 'lamb_circle.svg');

const sizes = [16, 32, 48, 64, 96, 128, 192, 256];

async function generateFavicons() {
  try {
    console.log('Generating favicon PNGs from SVG...');
    
    // The SVG viewBox has been optimized to crop whitespace (600 600 2000 2000)
    // This makes the lamb fill more of the favicon space
    
    // Generate PNG files for each size
    for (const size of sizes) {
      const outputPath = join(publicDir, `favicon-${size}x${size}.png`);
      await sharp(svgPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      console.log(`✓ Generated favicon-${size}x${size}.png`);
    }
    
    // Also create a standard favicon.ico (using 32x32 as the main size)
    const icoPath = join(publicDir, 'favicon.ico');
    await sharp(svgPath)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(icoPath);
    console.log(`✓ Generated favicon.ico`);
    
    console.log('\nAll favicons generated successfully!');
  } catch (error) {
    console.error('Error generating favicons:', error);
    process.exit(1);
  }
}

generateFavicons();
