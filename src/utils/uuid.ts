export function generateUUIDv7(): string {
  const now = Date.now();
  const hex = now.toString(16).padStart(12, '0');
  const bytes = new Uint8Array(16);

  bytes[0] = parseInt(hex.slice(0, 2), 16);
  bytes[1] = parseInt(hex.slice(2, 4), 16);
  bytes[2] = parseInt(hex.slice(4, 6), 16);
  bytes[3] = parseInt(hex.slice(6, 8), 16);
  bytes[4] = parseInt(hex.slice(8, 10), 16);
  bytes[5] = parseInt(hex.slice(10, 12), 16);

  bytes[5] &= 0x0f;
  bytes[5] |= 0x70;
  bytes[6] &= 0x3f;
  bytes[6] |= 0x80;

  const random = new Uint8Array(8);
  for (let i = 0; i < 8; i++) {
    random[i] = Math.floor(Math.random() * 256);
  }
  for (let i = 0; i < 8; i++) {
    bytes[8 + i] = random[i];
  }

  const hexStr = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return (
    hexStr.slice(0, 8) +
    '-' +
    hexStr.slice(8, 12) +
    '-' +
    hexStr.slice(12, 16) +
    '-' +
    hexStr.slice(16, 20) +
    '-' +
    hexStr.slice(20, 32)
  );
}
