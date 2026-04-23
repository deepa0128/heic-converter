const { convertHeicToJpeg } = require('./src/converter');
const FormData = require('form-data');
const axios = require('axios');

/**
 * AWS Lambda handler.
 *
 * Expected event fields:
 *   - image        {string}  Base64-encoded HEIC image (required)
 *   - quality      {number}  JPEG quality 0–1 (optional, default 0.92)
 *   - [any others] {*}       Extra fields forwarded as form-data fields to WEBHOOK_URL (optional)
 *
 * Environment variables:
 *   - WEBHOOK_URL  POST destination for the converted JPEG (optional).
 *                  If omitted the JPEG is returned as base64 in the response body.
 *   - JPEG_QUALITY Default JPEG quality when not supplied in the event (optional).
 */
exports.handler = async (event) => {
  const { image: base64Image, quality: eventQuality, ...extraFields } = event;

  if (!base64Image) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Missing required field: image' }),
    };
  }

  const quality = parseFloat(eventQuality ?? process.env.JPEG_QUALITY ?? 0.92);

  let inputBuffer;
  try {
    inputBuffer = Buffer.from(base64Image, 'base64');
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Invalid base64 image data' }),
    };
  }

  let outputBuffer;
  try {
    outputBuffer = await convertHeicToJpeg(inputBuffer, quality);
  } catch (err) {
    return {
      statusCode: 422,
      body: JSON.stringify({ message: 'Failed to convert image', error: err.message }),
    };
  }

  const webhookUrl = process.env.WEBHOOK_URL;

  if (webhookUrl) {
    try {
      const formData = new FormData();
      formData.append('file', outputBuffer, { filename: 'output.jpg', contentType: 'image/jpeg' });

      for (const [key, value] of Object.entries(extraFields)) {
        formData.append(key, String(value));
      }

      await axios.post(webhookUrl, formData, { headers: formData.getHeaders() });
    } catch (err) {
      return {
        statusCode: 502,
        body: JSON.stringify({ message: 'Conversion succeeded but webhook delivery failed', error: err.message }),
      };
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Image converted successfully',
      image: outputBuffer.toString('base64'),
      inputSizeKb: (inputBuffer.length / 1024).toFixed(2),
      outputSizeKb: (outputBuffer.length / 1024).toFixed(2),
    }),
  };
};
