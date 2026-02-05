import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const infoSvgPath = join(__dirname, '../src/assets/info-i-icon3.svg');
const iosAssetsPath = join(__dirname, '../../ios/ChapterADay/ChapterADay/Assets.xcassets/InfoIcon.imageset');

// iOS toolbar icon sizes: @1x 24pt, @2x 48pt, @3x 72pt
const sizes = [24, 48, 72];

async function generateInfoIcon() {
  try {
    if (!existsSync(iosAssetsPath)) {
      mkdirSync(iosAssetsPath, { recursive: true });
    }

    console.log('Generating info icon PNGs for iOS from info-i-icon3.svg...');

    for (const size of sizes) {
      const outputPath = join(iosAssetsPath, `info-${size}.png`);
      await sharp(infoSvgPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      console.log(`✓ Generated info-${size}.png`);
    }

    const contentsJson = {
      images: [
        { filename: 'info-24.png', idiom: 'universal', scale: '1x' },
        { filename: 'info-48.png', idiom: 'universal', scale: '2x' },
        { filename: 'info-72.png', idiom: 'universal', scale: '3x' }
      ],
      info: { author: 'xcode', version: 1 }
    };

    const fs = await import('fs');
    fs.writeFileSync(
      join(iosAssetsPath, 'Contents.json'),
      JSON.stringify(contentsJson, null, 2)
    );
    console.log('✓ Created Contents.json');
    console.log('\nInfo icon generated successfully!');
  } catch (error) {
    console.error('Error generating info icon:', error);
    process.exit(1);
  }
}

generateInfoIcon();
