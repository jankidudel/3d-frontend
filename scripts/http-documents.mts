export const maxDocumentBytes = 4 * 1024 * 1024;
export async function boundedBytes(response: Response): Promise<Uint8Array> {
  if (!response.body) {
    return new Uint8Array();
  }
  const reader = response.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      size += value.length;
      if (size > maxDocumentBytes) {
        await reader.cancel();
        throw new Error(
          `Document truncated: exceeds ${maxDocumentBytes} bytes.`,
        );
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const data = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    data.set(part, offset);
    offset += part.length;
  }
  return data;
}
