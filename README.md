# heic-converter

A lightweight Node.js library for converting HEIC/HEIF images to JPEG. Can be used as a standalone module in any Node.js project or deployed as an AWS Lambda function.

---

## Features

- Converts HEIC/HEIF images (e.g. iPhone photos) to JPEG
- Configurable JPEG quality
- Works as a plain Node.js library — no AWS dependency required
- Ships a ready-to-deploy AWS Lambda handler with optional webhook delivery
- Zero hardcoded URLs or paths — fully configurable via environment variables

---

## Installation

```bash
npm install
```

> **Node.js >= 12** is required (heic-convert uses WebAssembly internally).

---

## Usage

### As a Node.js library

Import and call `convertHeicToJpeg` directly in any Node.js project:

```js
const { convertHeicToJpeg } = require('./src/converter');
const fs = require('fs');

const inputBuffer = fs.readFileSync('photo.heic');
const jpegBuffer = await convertHeicToJpeg(inputBuffer, 0.85); // quality: 0–1
fs.writeFileSync('photo.jpg', jpegBuffer);
```

#### API

```
convertHeicToJpeg(inputBuffer, quality?) → Promise<Buffer>
```

| Parameter     | Type              | Default | Description                        |
|---------------|-------------------|---------|------------------------------------|
| `inputBuffer` | `Buffer`          | —       | Raw HEIC file contents (required)  |
| `quality`     | `number` (0–1)    | `0.92`  | JPEG output quality (optional)     |

Returns a `Promise` that resolves to a JPEG `Buffer`.

---

### As an AWS Lambda function

The root `index.js` is an AWS Lambda handler. It accepts a JSON event, converts the image, and either returns the JPEG or POSTs it to a webhook.

#### Event payload

```json
{
  "image": "<base64-encoded HEIC>",
  "quality": 0.85,
  "anyExtraField": "forwarded to webhook as-is"
}
```

| Field           | Type     | Required | Description                                        |
|-----------------|----------|----------|----------------------------------------------------|
| `image`         | `string` | Yes      | Base64-encoded HEIC image                          |
| `quality`       | `number` | No       | JPEG quality 0–1. Falls back to `JPEG_QUALITY` env var, then `0.92` |
| any other field | `*`      | No       | Forwarded as form-data fields to `WEBHOOK_URL`     |

#### Response

```json
{
  "statusCode": 200,
  "body": {
    "message": "Image converted successfully",
    "image": "<base64-encoded JPEG>",
    "inputSizeKb": "1024.00",
    "outputSizeKb": "312.45"
  }
}
```

The `image` field in the response always contains the converted JPEG as base64, regardless of whether a webhook is configured.

---

## Configuration

Configure via environment variables (Lambda environment or a local `.env` file):

| Variable      | Required | Default | Description                                                                 |
|---------------|----------|---------|-----------------------------------------------------------------------------|
| `WEBHOOK_URL` | No       | —       | If set, the converted JPEG is POSTed here as `multipart/form-data`. The file is sent under the key `file`, plus any extra event fields. |
| `JPEG_QUALITY`| No       | `0.92`  | Default JPEG quality when not specified in the event payload.               |

Copy `.env.example` to `.env` for local development:

```bash
cp .env.example .env
```

---

## Deploying to AWS Lambda

### 1. Package the function

```bash
npm run package
```

This produces `function.zip` containing `index.js`, `src/`, `node_modules/`, and `package.json`.

### 2. Create or update the Lambda

**Create:**
```bash
aws lambda create-function \
  --function-name heic-converter \
  --runtime nodejs18.x \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --role arn:aws:iam::<account-id>:role/<execution-role>
```

**Update (existing function):**
```bash
aws lambda update-function-code \
  --function-name heic-converter \
  --zip-file fileb://function.zip
```

### 3. Set environment variables

```bash
aws lambda update-function-configuration \
  --function-name heic-converter \
  --environment "Variables={WEBHOOK_URL=https://your-endpoint.example.com/upload,JPEG_QUALITY=0.85}"
```

### 4. Invoke

```bash
aws lambda invoke \
  --function-name heic-converter \
  --payload '{"image":"<base64>"}' \
  response.json
```

---

## Project structure

```
heic-converter/
├── src/
│   └── converter.js   # Core conversion logic (framework-agnostic)
├── index.js           # AWS Lambda handler
├── .env.example       # Environment variable template
├── package.json
└── README.md
```

---

## License

ISC
