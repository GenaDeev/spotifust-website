import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const source = '/home/elgena/Proyectos/spotifust/assets/spotifust.png';
const outDir = '/home/elgena/Proyectos/spotifust-website/public';

async function generate() {
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Copia el original
  fs.copyFileSync(source, path.join(outDir, 'spotifust.png'));

  // Favicons básicos
  await sharp(source).resize(32, 32).toFile(path.join(outDir, 'favicon-32x32.png'));
  await sharp(source).resize(16, 16).toFile(path.join(outDir, 'favicon-16x16.png'));
  
  // Apple Touch Icon
  await sharp(source).resize(180, 180).toFile(path.join(outDir, 'apple-touch-icon.png'));
  
  // Android / Chrome / PWA
  await sharp(source).resize(192, 192).toFile(path.join(outDir, 'android-chrome-192x192.png'));
  await sharp(source).resize(512, 512).toFile(path.join(outDir, 'android-chrome-512x512.png'));

  console.log('✅ Todos los iconos generados correctamente.');
}

generate().catch(console.error);
