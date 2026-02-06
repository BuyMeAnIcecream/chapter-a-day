import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const hornSvgPath = join(__dirname, '../src/assets/horn-icon.svg');
const iosAssetsPath = join(__dirname, '../../ios/ChapterADay/ChapterADay/Assets.xcassets/HornIcon.imageset');

// iOS toolbar icon sizes: @1x 24pt, @2x 48pt, @3x 72pt
const sizes = [24, 48, 72];

async function generateHornIcon() {
  try {
    if (!existsSync(iosAssetsPath)) {
      mkdirSync(iosAssetsPath, { recursive: true });
    }

    console.log('Generating horn icon PNGs for iOS...');

    for (const size of sizes) {
      const outputPath = join(iosAssetsPath, `horn-${size}.png`);
      await sharp(hornSvgPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      console.log(`✓ Generated horn-${size}.png`);
    }

    const contentsJson = {
      images: [
        { filename: 'horn-24.png', idiom: 'universal', scale: '1x' },
        { filename: 'horn-48.png', idiom: 'universal', scale: '2x' },
        { filename: 'horn-72.png', idiom: 'universal', scale: '3x' }
      ],
      info: { author: 'xcode', version: 1 }
    };

    const fs = await import('fs');
    fs.writeFileSync(
      join(iosAssetsPath, 'Contents.json'),
      JSON.stringify(contentsJson, null, 2)
    );
    console.log('✓ Created Contents.json');
    console.log('\nHorn icon generated successfully!');
  } catch (error) {
    console.error('Error generating horn icon:', error);
    process.exit(1);
  }
}

generateHornIcon();
