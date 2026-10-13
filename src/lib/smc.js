// Observed SuMoth profile from a user-supplied recording. Unknown header fields
// are opaque: this is not an official format specification.
export const SMC_HEADER_SIZE = 29;
export const SMC_RECORD_SIZE = 14;
const MAGIC = 0x534d4331;
export const isSMC = (bytes) =>
  bytes.byteLength >= 4 &&
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(
    0,
    true,
  ) === MAGIC;
function dateFromHeader(view) {
  const year = view.getUint16(6, true),
    month = view.getUint8(8),
    day = view.getUint8(9);
  const ms = Date.UTC(year, month - 1, day);
  const date = new Date(ms);
  if (
    year < 2000 ||
    year > 2099 ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    throw new Error("SMC: data nell’intestazione non valida.");
  return date.toISOString().slice(0, 10);
}
export function parseSMC(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.byteLength < SMC_HEADER_SIZE || !isSMC(bytes))
    throw new Error("SMC: intestazione binaria non riconosciuta.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes[4] !== 3 || bytes[5] !== 17 || bytes[17] !== 2)
    throw new Error(
      "SMC: profilo non supportato. Serve la specifica di questa variante.",
    );
  const payload = bytes.byteLength - SMC_HEADER_SIZE;
  if (payload % SMC_RECORD_SIZE)
    throw new Error("SMC: file troncato, il record finale è incompleto.");
  const count = payload / SMC_RECORD_SIZE;
  if (!count || count !== view.getUint32(20, true))
    throw new Error(
      "SMC: il numero di record non corrisponde all’intestazione.",
    );
  const date = dateFromHeader(view);
  let dayOffset = 0,
    previousClock,
    start;
  const samples = [];
  for (let i = 0; i < count; i++) {
    const o = SMC_HEADER_SIZE + i * SMC_RECORD_SIZE;
    const latE6 = view.getInt32(o, true),
      lonE6 = view.getInt32(o + 4, true);
    const speedRaw = view.getUint16(o + 8, true);
    const hour = bytes[o + 10],
      minute = bytes[o + 11],
      second = bytes[o + 12],
      satellites = bytes[o + 13];
    if (
      hour > 23 ||
      minute > 59 ||
      second > 59 ||
      Math.abs(latE6) > 90000000 ||
      Math.abs(lonE6) > 180000000
    )
      throw new Error(`SMC: record ${i + 1} non valido.`);
    const clock = hour * 3600 + minute * 60 + second;
    if (previousClock !== undefined && clock < previousClock) {
      if (previousClock - clock < 43200)
        throw new Error(`SMC: orario fuori sequenza al record ${i + 1}.`);
      dayOffset += 86400;
    }
    previousClock = clock;
    const absolute = dayOffset + clock;
    start ??= absolute;
    const sample = {
      timestamp_ms: (absolute - start) * 1000,
      timestamp_s: absolute - start,
      smc_clock_s: absolute,
      smc_lat_e6: latE6,
      smc_lon_e6: lonE6,
      speed_raw: speedRaw,
      speed_knots: (speedRaw * 0.0036) / 1.852,
      satellites,
    };
    if (satellites > 0 && !(latE6 === 0 && lonE6 === 0)) {
      sample.lat = latE6 / 1e6;
      sample.lon = lonE6 / 1e6;
    }
    samples.push(sample);
  }
  return {
    samples,
    smc: {
      profile: "sumoth-observed-v3",
      date,
      deviceId: new TextDecoder().decode(bytes.slice(13, 17)),
      headerBytes: Array.from(bytes.slice(0, SMC_HEADER_SIZE)),
      recordCount: count,
      speedUnit: "mm/s",
      speedUnitEvidence: "sumoth-dashboard-csv-comparison",
      nominalRateHz: 2,
      timeBasis: "device-clock-unknown-timezone",
      precisionSeconds: 1,
    },
  };
}
export const SMC_SPEED_UNITS = {
  unknown: null,
  "mm/s": (0.001 * 3600) / 1852,
  "cm/s": (0.01 * 3600) / 1852,
  "0.01 kn": 0.01,
};
export function withSMCSpeedUnit(samples, unit) {
  if (!Object.hasOwn(SMC_SPEED_UNITS, unit))
    throw new Error("Unità SMC non supportata.");
  return samples.map((sample) => {
    const row = { ...sample };
    delete row.speed_knots;
    return unit === "unknown"
      ? row
      : { ...row, speed_knots: row.speed_raw * SMC_SPEED_UNITS[unit] };
  });
}
// Rebuild the ORIGINAL recording byte for byte. Do not update unknown header
// fields or imply that cropped/generated files are accepted by a SuMoth logger.
export function encodeSMCOriginal(session) {
  const { smc, samples } = session;
  if (
    smc?.profile !== "sumoth-observed-v3" ||
    !Array.isArray(smc.headerBytes) ||
    smc.headerBytes.length !== SMC_HEADER_SIZE ||
    smc.headerBytes.some((b) => !Number.isInteger(b) || b < 0 || b > 255)
  )
    throw new Error("Intestazione originale SMC mancante o non valida.");
  const bytes = new Uint8Array(
    SMC_HEADER_SIZE + samples.length * SMC_RECORD_SIZE,
  );
  bytes.set(smc.headerBytes);
  const view = new DataView(bytes.buffer);
  if (view.getUint32(20, true) !== samples.length)
    throw new Error(
      "SMC originale: i record non devono essere rimossi o aggiunti. Esporta un CSV per gli intervalli.",
    );
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i],
      o = SMC_HEADER_SIZE + i * SMC_RECORD_SIZE;
    const fields = [
      ["smc_lat_e6", -90000000, 90000000],
      ["smc_lon_e6", -180000000, 180000000],
      ["speed_raw", 0, 65535],
      ["smc_clock_s", 0, 8640000],
      ["satellites", 0, 255],
    ];
    for (const [field, min, max] of fields)
      if (!Number.isInteger(s[field]) || s[field] < min || s[field] > max)
        throw new Error(`SMC: valore ${field} non rappresentabile.`);
    const clock = s.smc_clock_s % 86400;
    view.setInt32(o, s.smc_lat_e6, true);
    view.setInt32(o + 4, s.smc_lon_e6, true);
    view.setUint16(o + 8, s.speed_raw, true);
    bytes[o + 10] = Math.floor(clock / 3600);
    bytes[o + 11] = Math.floor((clock % 3600) / 60);
    bytes[o + 12] = clock % 60;
    bytes[o + 13] = s.satellites;
  }
  parseSMC(bytes); // Validate also when rebuilding a JSON backup.
  return bytes;
}
