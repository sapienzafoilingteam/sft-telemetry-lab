import Papa from "papaparse";

const number = (value) =>
  value === "" || value == null || !Number.isFinite(Number(value))
    ? null
    : Number(value);
const pick = (row, ...keys) => {
  for (const key of keys) {
    const value = number(row[key]);
    if (value !== null) return value;
  }
  return null;
};
export function normalize(row) {
  const ms =
    pick(row, "timestamp_ms", "millis") ??
    (pick(row, "timestamp_s", "timestamp", "elapsed_s") ?? 0) * 1000;
  const r = { timestamp_ms: ms, timestamp_s: ms / 1000 };
  const aliases = {
    lat: ["lat", "latitude", "gps_lat"],
    lon: ["lon", "lng", "longitude", "gps_lng"],
    altitude_m: ["altitude_m", "alt", "gps_alt", "height_m"],
    satellites: ["satellites", "sats", "gps_sats"],
    pitch_deg: ["pitch_deg", "pitch"],
    roll_deg: ["roll_deg", "roll"],
    yaw_deg: ["yaw_deg", "yaw"],
    gyro_x: ["gyro_x", "gx"],
    gyro_y: ["gyro_y", "gy"],
    gyro_z: ["gyro_z", "gz"],
  };
  for (const [key, keys] of Object.entries(aliases)) {
    const value = pick(row, ...keys);
    if (value !== null) r[key] = value;
  }
  const speed = pick(row, "speed_knots");
  if (speed !== null) r.speed_knots = speed;
  else {
    const kmh = pick(row, "gps_speed", "speed");
    if (kmh !== null) r.speed_knots = kmh / 1.852;
  }
  // ESP32 ax/ay/az are in g; legacy acc_x/y/z files use m/s².
  for (const axis of ["x", "y", "z"]) {
    const g = pick(row, `a${axis}`);
    const si = pick(row, `acc_${axis}`);
    if (g !== null || si !== null) r[`acc_${axis}`] = g ?? si / 9.80665;
  }
  if (pick(row, "acceleration_g") !== null)
    r.acc_z = pick(row, "acceleration_g");
  if (row.fix === 0 || row.fix === false) {
    delete r.lat;
    delete r.lon;
  }
  return r;
}
export const hasGps = (r) =>
  Number.isFinite(r.lat) &&
  Number.isFinite(r.lon) &&
  Math.abs(r.lat) <= 90 &&
  Math.abs(r.lon) <= 180 &&
  !(r.lat === 0 && r.lon === 0);
export const hasImu = (r) =>
  [
    "pitch_deg",
    "roll_deg",
    "yaw_deg",
    "acc_x",
    "acc_y",
    "acc_z",
    "gyro_x",
    "gyro_y",
    "gyro_z",
  ].some((k) => Number.isFinite(r[k]));
export function parseCSV(text) {
  const sumoth = /^#DEVICE:\S+ RATE:2Hz VERSION:SMC3\s*$/m.test(text);
  if (text.trimStart().startsWith("#DEVICE:") && !sumoth)
    throw new Error("CSV SuMoth: versione o frequenza non supportata.");
  if (sumoth)
    text = text
      .split(/\r?\n/)
      .filter((line) => !line.startsWith("#"))
      .join("\n");
  const first = Papa.parse(text.trim(), { skipEmptyLines: true }).data[0];
  if (sumoth && (!/^\d{8}$/.test(String(first?.[0])) || first.length !== 6))
    throw new Error("CSV SuMoth: record iniziale non valido.");
  let rows;
  if (/^\d{8}$/.test(String(first?.[0])) && first.length === 6) {
    rows = Papa.parse(text, { skipEmptyLines: true }).data.map((a) => {
      if (
        sumoth &&
        (a.length !== 6 ||
          !/^\d{8}$/.test(a[0]) ||
          !/^\d{6}$/.test(a[1]) ||
          a.some((v) => v === "" || !Number.isFinite(Number(v))))
      )
        throw new Error("CSV SuMoth: record non valido.");
      const t = String(a[1]).padStart(6, "0");
      const d = String(a[0]);
      return {
        timestamp_ms: Date.UTC(
          +d.slice(0, 4),
          +d.slice(4, 6) - 1,
          +d.slice(6, 8),
          +t.slice(0, 2),
          +t.slice(2, 4),
          +t.slice(4, 6),
        ),
        lat: a[2],
        lon: a[3],
        ...(sumoth ? { speed: a[4] } : { speed_knots: a[4] }),
        satellites: a[5],
        ...(sumoth && +a[5] === 0 ? { fix: 0 } : {}),
      };
    });
  } else {
    const result = Papa.parse(text, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    });
    if (result.errors.length)
      throw new Error(
        "CSV non valido: controlla intestazione e numero di colonne.",
      );
    rows = result.data;
  }
  const samples = rows
    .map(normalize)
    .filter((r) => hasGps(r) || hasImu(r))
    .sort((a, b) => a.timestamp_ms - b.timestamp_ms);
  if (!samples.length)
    throw new Error("Nessun campione GPS o IMU valido nel file.");
  const start = samples[0].timestamp_ms;
  return samples.map((r) => ({
    ...r,
    timestamp_ms: r.timestamp_ms - start,
    timestamp_s: (r.timestamp_ms - start) / 1000,
  }));
}
export function parseMessage(text, elapsedMs) {
  try {
    if (text.trim().startsWith("{")) {
      const r = normalize(JSON.parse(text));
      return hasGps(r) || hasImu(r) ? r : null;
    }
    const a = text.trim().split(",");
    if (a[0] === "D" && a.length === 19) {
      const keys = [
        "timestamp_ms",
        "roll",
        "pitch",
        "yaw",
        "ax",
        "ay",
        "az",
        "gx",
        "gy",
        "gz",
        "mx",
        "my",
        "mz",
        "lat",
        "lng",
        "alt",
        "speed",
        "sats",
      ];
      const r = normalize(
        Object.fromEntries(keys.map((k, i) => [k, a[i + 1]])),
      );
      return hasImu(r) || hasGps(r) ? r : null;
    }
    if (a[0] === "IMU" && a.length === 4)
      return normalize({
        timestamp_ms: elapsedMs,
        roll: a[1],
        pitch: a[2],
        yaw: a[3],
      });
    if (a[0] === "GPS" && a.length >= 8)
      return normalize({
        timestamp_ms: a[1],
        lat: a[2],
        lng: a[3],
        alt: a[4],
        speed: a[5],
        sats: a[6],
        fix: +a[7],
      });
    if (a[0] === "GPS" && a.length === 4) {
      const r = normalize({
        timestamp_ms: elapsedMs,
        sats: a[1],
        lat: a[2],
        lng: a[3],
      });
      return hasGps(r) ? r : null;
    }
  } catch {
    /* Status and diagnostic messages are not samples. */
  }
  return null;
}
export function metrics(samples) {
  const speeds = samples.map((r) => r.speed_knots).filter(Number.isFinite);
  let distance = 0;
  let previous;
  for (const r of samples.filter(hasGps)) {
    if (previous) {
      const rad = Math.PI / 180;
      const a =
        Math.sin(((r.lat - previous.lat) * rad) / 2) ** 2 +
        Math.cos(previous.lat * rad) *
          Math.cos(r.lat * rad) *
          Math.sin(((r.lon - previous.lon) * rad) / 2) ** 2;
      distance +=
        6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
    }
    previous = r;
  }
  return {
    duration: samples.length
      ? samples.at(-1).timestamp_s - samples[0].timestamp_s
      : 0,
    maxSpeed: speeds.length
      ? speeds.reduce((m, n) => Math.max(m, n), -Infinity)
      : null,
    avgSpeed: speeds.length
      ? speeds.reduce((a, b) => a + b, 0) / speeds.length
      : null,
    distance,
  };
}
export function download(name, content, type = "application/json") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
