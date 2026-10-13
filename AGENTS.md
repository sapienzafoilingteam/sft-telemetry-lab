# Working on SFT Telemetry Lab

Read `README.md`, `CONTRIBUTING.md`, and `docs/PROTOCOL.md` before changing acquisition, parsing, units, or persistence. Firmware and bridge live in the separate `sapienzafoilingteam/sft-telemetry` repository.

- Work on a feature branch and keep changes scoped.
- Run `npm run lint`, `npm test`, and `npm run build` before proposing a PR.
- Use synthetic fixtures. Never commit recordings, precise personal GPS data, credentials, or generated builds.
- Preserve unknown/missing measurements as missing; do not fabricate zero values.
- Keep normalized units and timestamp semantics explicit. Protocol/schema changes need compatibility tests and documentation.
- Preserve archived sessions. Storage changes need a migration and backup/recovery plan.
- Verify responsive UI in a browser. Distinguish automated checks, simulated acquisition, and physical hardware verification in reports.
- Do not promise cloud sync, offline basemaps, hardware calibration, or crash recovery until implemented and tested.
