import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_IMAGE_BYTES = 1048576;
const MAX_DIMENSION = 1024;
const EXPECTED_SHA256 = '1ad8d78d8d78f1930a38e68223219d088a97c02880ae214c273c948a7ddbf596';

interface ImageDimensions {
  format: 'png' | 'jpeg';
  width: number;
  height: number;
}

function isPngMagic(bytes: Buffer): boolean {
  return (
    bytes.length >= 24 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  );
}

function isJpegMagic(bytes: Buffer): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[bytes.length - 2] === 0xff &&
    bytes[bytes.length - 1] === 0xd9
  );
}

function parsePngDimensions(bytes: Buffer): ImageDimensions {
  const ihdrTag = bytes.subarray(12, 16).toString('ascii');
  if (ihdrTag !== 'IHDR') {
    throw new Error('Malformed PNG: missing IHDR header chunk.');
  }
  const iendTrailer = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);
  if (bytes.length < 33 || !bytes.subarray(bytes.length - 12).equals(iendTrailer)) {
    throw new Error('Malformed PNG: missing IEND trailer chunk.');
  }
  return {
    format: 'png',
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

function parseJpegDimensions(bytes: Buffer): ImageDimensions {
  const sofMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let offset = 2;
  while (offset + 3 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (offset < bytes.length && bytes[offset] === 0xff) {
      offset += 1;
    }
    if (offset >= bytes.length) break;
    const marker = bytes[offset++];
    if (marker === 0x00 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      continue;
    }
    if (offset + 1 >= bytes.length) break;
    const segmentLen = bytes.readUInt16BE(offset);
    if (sofMarkers.has(marker) && offset + 6 < bytes.length) {
      return {
        format: 'jpeg',
        height: bytes.readUInt16BE(offset + 3),
        width: bytes.readUInt16BE(offset + 5),
      };
    }
    offset += segmentLen;
  }
  throw new Error('Malformed JPEG: missing SOF frame dimensions.');
}

function inspectImage(bytes: Buffer): ImageDimensions {
  if (isPngMagic(bytes)) return parsePngDimensions(bytes);
  if (isJpegMagic(bytes)) return parseJpegDimensions(bytes);
  throw new Error('Source image does not match PNG or JPEG file signatures.');
}

function sha256Hex(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function run(): void {
  const rootDir = dirname(fileURLToPath(import.meta.url));
  const sourcePath = join(rootDir, 'entry.png');

  if (!existsSync(sourcePath)) {
    throw new Error(`Missing source image at ${sourcePath}`);
  }

  const imageBytes = readFileSync(sourcePath);
  if (imageBytes.length === 0 || imageBytes.length > MAX_IMAGE_BYTES) {
    throw new Error(`Invalid image byte size: ${imageBytes.length} bytes (limit ${MAX_IMAGE_BYTES})`);
  }

  const dims = inspectImage(imageBytes);
  if (dims.width < 1 || dims.height < 1 || dims.width > MAX_DIMENSION || dims.height > MAX_DIMENSION) {
    throw new Error(`Image dimensions ${dims.width}x${dims.height} exceed ${MAX_DIMENSION}x${MAX_DIMENSION}`);
  }

  const sourceHash = sha256Hex(imageBytes);
  if (sourceHash !== EXPECTED_SHA256) {
    throw new Error(`Source image SHA-256 mismatch: expected ${EXPECTED_SHA256}, got ${sourceHash}`);
  }

  const outputDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
  mkdirSync(outputDir, { recursive: true });

  const destPath = join(outputDir, 'entry.png');
  writeFileSync(destPath, imageBytes);

  const writtenBytes = readFileSync(destPath);
  if (!writtenBytes.equals(imageBytes)) {
    throw new Error(`Output verification failed at ${destPath}`);
  }
}

run();
