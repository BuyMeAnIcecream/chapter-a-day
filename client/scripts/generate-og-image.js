import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '../public');
const svgPath = join(publicDir, 'lamb_circle.svg');
const outputPath = join(publicDir, 'og-image.png');

async function generateOgImage() {
  try {
    console.log('Generating og-image.png (1200x630) from SVG...');

    await sharp(svgPath)
      .resize(630, 630, {
        fit: 'contain',
        background: { r: 248, g: 248, b: 248, alpha: 1 },
      })
      .extend({
        top: 0,
        bottom: 0,
        left: 285,
        right: 285,
        background: { r: 248, g: 248, b: 248, alpha: 1 },
      })
      .png()
      .toFile(outputPath);

    console.log('✓ Generated og-image.png');
  } catch (error) {
    console.error('Error generating og-image:', error);
    process.exit(1);
  }
}

generateOgImage();
