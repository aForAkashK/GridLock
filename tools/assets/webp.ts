/* eslint-disable no-bitwise -- WebP frame headers pack dimensions into bit fields. */
/** Read only a WebP container header; no decoding or third-party image parsers. */
export function webpDimensions(data: Buffer): {
  width: number;
  height: number;
} {
  if (
    data.length < 30 ||
    data.toString("ascii", 0, 4) !== "RIFF" ||
    data.toString("ascii", 8, 12) !== "WEBP"
  ) {
    throw new Error("Invalid WebP header");
  }
  const kind = data.toString("ascii", 12, 16);
  let width: number, height: number;
  if (kind === "VP8X") {
    width = data.readUIntLE(24, 3) + 1;
    height = data.readUIntLE(27, 3) + 1;
  } else if (kind === "VP8 ") {
    if (!data.subarray(23, 26).equals(Buffer.from([0x9d, 0x01, 0x2a]))) {
      throw new Error("Invalid VP8 frame");
    }
    width = data.readUInt16LE(26) & 0x3fff;
    height = data.readUInt16LE(28) & 0x3fff;
  } else if (kind === "VP8L" && data[20] === 0x2f) {
    const bits = data.readUInt32LE(21);
    width = (bits & 0x3fff) + 1;
    height = ((bits >>> 14) & 0x3fff) + 1;
  } else {
    throw new Error("Unsupported WebP header");
  }
  if (!width || !height) {
    throw new Error("Empty WebP dimensions");
  }
  return { width, height };
}
