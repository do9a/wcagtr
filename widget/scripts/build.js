import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { minify } from 'terser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_FILE = path.resolve(__dirname, '../../widget.js');
const DIST_DIR = path.resolve(__dirname, '../dist');
const DIST_FILE = path.resolve(DIST_DIR, 'widget.js');
const DIST_SRI_FILE = path.resolve(DIST_DIR, 'widget.sri.json');
const DIST_INTEGRITY_TXT = path.resolve(DIST_DIR, 'widget.integrity.txt');
const PUBLIC_KEY_TOKEN = '__WIDGET_PUBLIC_KEY_PEM__';

function getRequiredPublicKey() {
  const raw = process.env.WIDGET_JWT_PUBLIC_KEY_PEM || '';
  const normalized = raw.replace(/\\n/g, '\n').trim();

  if (!normalized) {
    throw new Error('WIDGET_JWT_PUBLIC_KEY_PEM gerekli (build-time).');
  }

  if (!normalized.includes('BEGIN PUBLIC KEY')) {
    throw new Error('WIDGET_JWT_PUBLIC_KEY_PEM geçerli bir PEM public key içermiyor.');
  }

  return normalized;
}

function escapeTemplateLiteral(input) {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
}

async function buildWidget() {
  const publicKeyPem = getRequiredPublicKey();
  const sourceCode = await fs.readFile(SOURCE_FILE, 'utf8');

  if (!sourceCode.includes(PUBLIC_KEY_TOKEN)) {
    throw new Error(`Kaynakta ${PUBLIC_KEY_TOKEN} token'ı bulunamadı.`);
  }

  const preparedCode = sourceCode.replace(PUBLIC_KEY_TOKEN, escapeTemplateLiteral(publicKeyPem));
  const minified = await minify(preparedCode, {
    compress: true,
    mangle: true,
    format: { comments: false },
  });

  if (!minified.code) {
    throw new Error('Minify işlemi başarısız: boş çıktı üretildi.');
  }

  const outputCode = `${minified.code}\n`;
  const hash = crypto.createHash('sha384').update(outputCode).digest('base64');
  const integrity = `sha384-${hash}`;

  await fs.mkdir(DIST_DIR, { recursive: true });
  await fs.writeFile(DIST_FILE, outputCode, 'utf8');
  await fs.writeFile(DIST_INTEGRITY_TXT, `${integrity}\n`, 'utf8');
  await fs.writeFile(
    DIST_SRI_FILE,
    `${JSON.stringify(
      {
        file: 'widget.js',
        integrity,
        generatedAt: new Date().toISOString(),
      },
      null,
      2
    )}\n`,
    'utf8'
  );

  console.log('✅ Widget production build tamamlandı');
  console.log(`   File: ${DIST_FILE}`);
  console.log(`   SRI : ${integrity}`);
}

buildWidget().catch((error) => {
  console.error('❌ Widget build hatası:', error.message);
  process.exit(1);
});
