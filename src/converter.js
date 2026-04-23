const heicConvert = require('heic-convert');

/**
 * Converts a HEIC image buffer to JPEG.
 *
 * @param {Buffer} inputBuffer - The raw HEIC file content
 * @param {number} [quality=0.92] - JPEG quality from 0 (worst) to 1 (best)
 * @returns {Promise<Buffer>} The converted JPEG buffer
 */
async function convertHeicToJpeg(inputBuffer, quality = 0.92) {
  if (!Buffer.isBuffer(inputBuffer) && !(inputBuffer instanceof Uint8Array)) {
    throw new TypeError('inputBuffer must be a Buffer or Uint8Array');
  }
  if (quality < 0 || quality > 1) {
    throw new RangeError('quality must be between 0 and 1');
  }

  const outputBuffer = await heicConvert({
    buffer: inputBuffer,
    format: 'JPEG',
    quality,
  });

  return Buffer.from(outputBuffer);
}

module.exports = { convertHeicToJpeg };
