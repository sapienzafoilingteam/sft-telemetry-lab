import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  parseSMC,
  encodeSMCOriginal,
  withSMCSpeedUnit,
} from "../src/lib/smc.js";
const fixture = () =>
  new Uint8Array(
    fs.readFileSync(
      new URL("./fixtures/sumoth-synthetic.smc", import.meta.url),
    ),
  );
test("SMC binary preserves each sample, integer-second timing and raw speed without assuming an unit", () => {
  const { samples, smc } = parseSMC(fixture());
  assert.equal(samples.length, 40);
  assert.equal(smc.recordCount, 40);
  assert.equal(smc.date, "2026-01-01");
  assert.equal(smc.deviceId, "DEMO");
  assert.equal(smc.speedUnit, "unknown");
  assert.equal(samples[0].timestamp_s, 0);
  assert.equal(samples[1].timestamp_s, 0);
  assert.equal(samples.at(-1).timestamp_s, 19);
  assert.equal(samples[0].lat, 0.01);
  assert.equal(samples[0].speed_raw, 1000);
  assert.equal(samples[0].speed_knots, undefined);
  assert.equal(samples[0].pitch_deg, undefined);
});
test("SMC original and JSON backup roundtrip preserve all binary bytes", () => {
  const bytes = fixture();
  bytes[18] = 43;
  bytes[24] = 128;
  bytes[28] = 7;
  const session = parseSMC(bytes);
  assert.deepEqual(encodeSMCOriginal(session), bytes);
  assert.deepEqual(
    encodeSMCOriginal(JSON.parse(JSON.stringify(session))),
    bytes,
  );
  const converted = {
    ...session,
    samples: withSMCSpeedUnit(session.samples, "mm/s"),
  };
  assert.deepEqual(encodeSMCOriginal(converted), bytes);
  assert(Math.abs(converted.samples[0].speed_knots - 3600 / 1852) < 1e-9);
  assert.equal(
    withSMCSpeedUnit(converted.samples, "unknown")[0].speed_knots,
    undefined,
  );
});
test("SMC rejects truncation, mismatched counts, unknown variants, invalid coordinates and dates", () => {
  assert.throws(() => parseSMC(fixture().slice(0, -1)), /troncato/);
  for (const [offset, value] of [
    [4, 4],
    [20, 1],
    [8, 13],
    [39, 25],
  ]) {
    const bytes = fixture();
    bytes[offset] = value;
    assert.throws(() => parseSMC(bytes));
  }
  const bad = fixture();
  new DataView(bad.buffer).setInt32(29, 91000000, true);
  assert.throws(() => parseSMC(bad), /record 1/);
  const session = parseSMC(fixture());
  session.samples.pop();
  assert.throws(() => encodeSMCOriginal(session), /rimossi/);
});
test("SMC rolls over midnight without inventing subsecond precision or sorting samples", () => {
  const bytes = fixture();
  const view = new DataView(bytes.buffer);
  view.setUint32(20, 2, true);
  const cropped = bytes.slice(0, 57);
  cropped[39] = 23;
  cropped[40] = 59;
  cropped[41] = 59;
  cropped[53] = 0;
  cropped[54] = 0;
  cropped[55] = 1;
  const session = parseSMC(cropped);
  assert.equal(session.samples[1].timestamp_s, 2);
  assert.equal(session.samples[1].smc_clock_s, 86401);
  assert.deepEqual(encodeSMCOriginal(session), cropped);
  cropped[39] = 10;
  cropped[40] = 0;
  cropped[41] = 2;
  cropped[53] = 10;
  cropped[54] = 0;
  cropped[55] = 1;
  assert.throws(() => parseSMC(cropped), /sequenza/);
});
test("SMC no-fix rows and typed-array offsets retain raw measurements for export", () => {
  const bytes = fixture();
  bytes[42] = 0;
  const larger = new Uint8Array(bytes.length + 5);
  larger.set(bytes, 3);
  const session = parseSMC(larger.subarray(3, 3 + bytes.length));
  assert.equal(session.samples[0].lat, undefined);
  assert.equal(session.samples[0].smc_lat_e6, 10000);
  assert.deepEqual(encodeSMCOriginal(session), bytes);
});
