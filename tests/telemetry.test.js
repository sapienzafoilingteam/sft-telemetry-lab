import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import Papa from "papaparse";
import { parseCSV, parseMessage, metrics } from "../src/lib/telemetry.js";

test("imports synthetic GPS, IMU and combined sessions", () => {
  for (const [name, length] of [
    ["dummy_data_garda.csv", 1200],
    ["dummy_gps_garda.csv", 120],
    ["dummy_imu_garda.csv", 3000],
  ]) {
    const rows = parseCSV(
      fs.readFileSync(new URL(`../${name}`, import.meta.url), "utf8"),
    );
    assert.equal(rows.length, length);
    assert.equal(rows[0].timestamp_s, 0);
    assert(Number.isFinite(metrics(rows).duration));
  }
});
test("ECK1 preserves time across midnight and coordinates", () => {
  const rows = parseCSV(
    "20260305,235959,45,10,12,7\n20260306,000001,45.1,10.1,13,7",
  );
  assert.equal(rows[1].timestamp_s, 2);
  assert.equal(rows[0].lat, 45);
});
test("ESP32 wire protocol converts km/h to knots and retains g", () => {
  const row = parseMessage(
    "D,1000,1,2,3,0,0,1,4,5,6,0,0,0,45,10,80,18.52,7",
    0,
  );
  assert.equal(row.speed_knots, 10);
  assert.equal(row.acc_z, 1);
  assert.equal(row.roll_deg, 1);
  assert.equal(parseMessage("STATUS:SYSTEM_READY", 0), null);
  assert.equal(parseMessage("GPS,7,NO_FIX,NO_FIX", 0), null);
});
test("SD file and exported CSV use consistent acceleration units", () => {
  const rows = parseCSV(
    "timestamp_ms,roll,pitch,yaw,ax,ay,az,gx,gy,gz,gps_lat,gps_lng,gps_alt,gps_speed,gps_sats\n1000,1,2,3,0,0,1,4,5,6,45,10,80,18.52,7",
  );
  assert.equal(rows[0].speed_knots, 10);
  assert.equal(rows[0].acc_z, 1);
  const exported = Papa.unparse(
    rows.map((r) => ({
      ...r,
      ax: r.acc_x,
      ay: r.acc_y,
      az: r.acc_z,
      acc_x: undefined,
      acc_y: undefined,
      acc_z: undefined,
    })),
  );
  assert.equal(parseCSV(exported)[0].acc_z, 1);
  const legacy = parseCSV("timestamp_ms,acc_z\n0,9.80665");
  assert.equal(legacy[0].acc_z, 1);
});
test("malformed and empty sessions are rejected instead of displaying fabricated metrics", () => {
  assert.throws(() => parseCSV("hello,world\na,b"));
  assert.throws(() => parseCSV("timestamp_ms,lat,lon\n0,0,0"));
  assert.equal(metrics([{ timestamp_s: 0, roll_deg: 1 }]).maxSpeed, null);
});

test("official SuMoth CSV metadata selects km/h instead of legacy ECK1 knots", () => {
  const text =
    "#DEVICE:DEMO RATE:2Hz VERSION:SMC3\n20260101,095038,0.01,0.01,18.52,8\n20260101,095038,0.010001,0.010001,9.26,8\n#CRC32:00000000";
  const rows = parseCSV(text);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].speed_knots, 10);
  assert.equal(rows[1].speed_knots, 5);
  assert.equal(rows[1].timestamp_s, 0);
  assert.throws(() => parseCSV(text.replace("SMC3", "SMC4")), /non supportata/);
  assert.throws(() => parseCSV(text.replace("18.52,8", "bad,8")), /non valido/);
  assert.throws(
    () => parseCSV(text.replace("20260101,095038", "date,clock")),
    /non valido/,
  );
  const legacy = parseCSV("20260101,095038,0.01,0.01,18.52,8");
  assert.equal(legacy[0].speed_knots, 18.52);
});
