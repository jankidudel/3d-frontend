import { MAX_DRAFT_BYTES, MAX_LOGO_PIXELS, type QuoteLogo } from './quotation';

function imageDimensions(bytes: Uint8Array): {
  width: number;
  height: number;
  type: string;
} {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (
    bytes.length >= 24 &&
    bytes
      .slice(0, 8)
      .every((byte, index) => byte === [137, 80, 78, 71, 13, 10, 26, 10][index])
  ) {
    return {
      width: view.getUint32(16),
      height: view.getUint32(20),
      type: 'image/png',
    };
  }
  if (bytes.length > 4 && bytes[0] === 255 && bytes[1] === 216) {
    let offset = 2;
    while (offset + 4 < bytes.length) {
      if (bytes[offset] !== 255) {
        throw new Error('The JPEG structure is invalid.');
      }
      const marker = bytes[offset + 1];
      if (marker === 255) {
        offset++;
        continue;
      }
      const length = view.getUint16(offset + 2);
      if (length < 2 || offset + 2 + length > bytes.length) {
        break;
      }
      if (
        [
          192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207,
        ].includes(marker) &&
        length >= 7
      ) {
        return {
          width: view.getUint16(offset + 7),
          height: view.getUint16(offset + 5),
          type: 'image/jpeg',
        };
      }
      offset += length + 2;
    }
  }
  throw new Error(
    'Choose a decoded PNG or JPEG logo, not an SVG or remote URL.',
  );
}
export async function decodeQuoteLogo(blob: Blob): Promise<QuoteLogo> {
  if (blob.size > MAX_DRAFT_BYTES) {
    throw new Error('The logo must be at most 1 MiB.');
  }
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const dimensions = imageDimensions(bytes);
  if (
    !dimensions.width ||
    !dimensions.height ||
    dimensions.width * dimensions.height > MAX_LOGO_PIXELS
  ) {
    throw new Error('The logo must contain at most 4 megapixels.');
  }
  const image = await createImageBitmap(
    new Blob([bytes], { type: dimensions.type }),
  );
  try {
    if (
      image.width !== dimensions.width ||
      image.height !== dimensions.height
    ) {
      throw new Error('The logo dimensions could not be verified.');
    }
  } finally {
    image.close();
  }
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return {
    dataUrl: `data:${dimensions.type};base64,${btoa(binary)}`,
    width: dimensions.width,
    height: dimensions.height,
  };
}
export async function validateDraftLogo(logo: QuoteLogo | null): Promise<void> {
  if (!logo) {
    return;
  }
  const [header, base64] = logo.dataUrl.split(',');
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const decoded = await decodeQuoteLogo(
    new Blob([bytes], {
      type: header.includes('image/png') ? 'image/png' : 'image/jpeg',
    }),
  );
  if (
    decoded.width !== logo.width ||
    decoded.height !== logo.height ||
    decoded.dataUrl !== logo.dataUrl
  ) {
    throw new Error('The saved logo does not match its decoded image data.');
  }
}
