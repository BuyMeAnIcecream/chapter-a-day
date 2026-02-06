import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const lambSvgPath = join(__dirname, '../public/lamb-white.svg');
const iosAppIconPath = join(__dirname, '../../ios/ChapterADay/ChapterADay/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png');

async function generateAppIcon() {
  try {
    console.log('Generating iOS app icon from lamb-white.svg...');

    await sharp(lambSvgPath)
      .resize(1024, 1024, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(iosAppIconPath);

    console.log('✓ Generated AppIcon-1024.png');
    console.log('\nApp icon generated successfully!');
  } catch (error) {
    console.error('Error generating app icon:', error);
    process.exit(1);
  }
}

generateAppIcon();
