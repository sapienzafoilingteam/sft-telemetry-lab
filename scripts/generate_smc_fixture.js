// Fictional measurements. Opaque header bytes are synthetic placeholders.
// This fixture exercises the observed parser; it is NOT an official logger output.
import fs from "node:fs";
const count = 40;
const bytes = new Uint8Array(29 + count * 14);
const view = new DataView(bytes.buffer);
view.setUint32(0, 0x534d4331, true);
bytes[4] = 3;
bytes[5] = 17;
view.setUint16(6, 2026, true);
bytes[8] = 1;
bytes[9] = 1;
bytes[10] = 10;
bytes.set(new TextEncoder().encode("DEMO"), 13);
bytes[17] = 2;
view.setUint32(20, count, true);
for (let i = 0; i < count; i++) {
  const o = 29 + i * 14;
  view.setInt32(o, 10000 + i * 5, true);
  view.setInt32(o + 4, 10000 + i * 5, true);
  view.setUint16(o + 8, 1000 + i * 100, true);
  bytes[o + 10] = 10;
  bytes[o + 12] = Math.floor(i / 2);
  bytes[o + 13] = 8;
}
for (const file of [
  "../tests/fixtures/sumoth-synthetic.smc",
  "../public/demo.smc",
])
  fs.writeFileSync(new URL(file, import.meta.url), bytes);
