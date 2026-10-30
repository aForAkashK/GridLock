import { webpDimensions } from "../../tools/assets/webp";
function header(kind: string): Buffer {
  const value = Buffer.alloc(30);
  value.write("RIFF", 0);
  value.write("WEBP", 8);
  value.write(kind, 12);
  return value;
}
it("reads extended, lossy and lossless WebP dimensions without decoding pixels", () => {
  const extended = header("VP8X");
  extended.writeUIntLE(383, 24, 3);
  extended.writeUIntLE(767, 27, 3);
  expect(webpDimensions(extended)).toEqual({ width: 384, height: 768 });
  const lossy = header("VP8 ");
  Buffer.from([0x9d, 1, 0x2a]).copy(lossy, 23);
  lossy.writeUInt16LE(243, 26);
  lossy.writeUInt16LE(512, 28);
  expect(webpDimensions(lossy)).toEqual({ width: 243, height: 512 });
  const lossless = header("VP8L");
  lossless[20] = 0x2f;
  lossless.writeUInt32LE(319 + 639 * 16384, 21);
  expect(webpDimensions(lossless)).toEqual({ width: 320, height: 640 });
});
it("rejects unsupported, truncated and malformed files", () => {
  expect(() => webpDimensions(Buffer.alloc(8))).toThrow();
  expect(() => webpDimensions(header("JPEG"))).toThrow();
  expect(() => webpDimensions(header("VP8 "))).toThrow();
  expect(() => webpDimensions(header("VP8L"))).toThrow();
});
