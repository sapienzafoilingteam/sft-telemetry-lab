import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import {
  Activity,
  Radio,
  FolderOpen,
  Download,
  Save,
  Upload,
  Square,
  Circle,
  Trash2,
  ArrowUpRight,
} from "lucide-react";
const MapTracker = lazy(() => import("./components/MapTracker"));
const GpsCharts = lazy(() =>
  import("./components/SensorCharts").then((m) => ({ default: m.GpsCharts })),
);
const ImuCharts = lazy(() =>
  import("./components/SensorCharts").then((m) => ({ default: m.ImuCharts })),
);
import {
  parseCSV,
  parseMessage,
  hasGps,
  hasImu,
  metrics,
  download,
} from "./lib/telemetry";
import { listSessions, saveSession, deleteSession } from "./lib/storage";

const duration = (seconds) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
const fresh = (samples, name, source) => ({
  id: crypto.randomUUID(),
  name,
  source,
  createdAt: new Date().toISOString(),
  notes: "",
  samples,
});
function App() {
  const [view, setView] = useState("acquisition");
  const [sessions, setSessions] = useState([]);
  const [session, setSession] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [endpoint, setEndpoint] = useState("ws://192.168.4.1:81");
  const [connection, setConnection] = useState("disconnected");
  const [recording, setRecording] = useState(false);
  const [count, setCount] = useState(0);
  const [latest, setLatest] = useState(null);
  const [query, setQuery] = useState("");
  const [range, setRange] = useState([0, Infinity]);
  const [cursor, setCursor] = useState(0);
  const [hover, setHover] = useState(null);
  const socket = useRef(null);
  const buffer = useRef([]);
  const recordingRef = useRef(false);
  const latestRef = useRef(null);
  const origin = useRef(null);
  const refresh = async () =>
    setSessions(
      (await listSessions()).sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      ),
    );
  useEffect(() => {
    refresh().catch((e) => setError(e.message));
    const timer = setInterval(() => {
      setCount(buffer.current.length);
      setLatest(latestRef.current);
    }, 300);
    return () => {
      clearInterval(timer);
      socket.current?.close();
    };
  }, []);
  const open = (value) => {
    setSession(value);
    setRange([0, Infinity]);
    setCursor(0);
    setHover(null);
    setView("analysis");
    setNotice("");
  };
  const run = async (fn) => {
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    }
  };
  const persist = () =>
    run(async () => {
      if (!session?.name.trim())
        throw new Error("Assegna un nome alla sessione.");
      await saveSession(session);
      await refresh();
      setNotice("Sessione salvata in questo browser.");
    });
  const importFile = async (event) => {
    const files = [...event.target.files];
    event.target.value = "";
    await run(async () => {
      let last;
      for (const file of files) {
        const text = await file.text();
        if (file.name.endsWith(".json")) {
          const data = JSON.parse(text);
          if (data.version !== 1 || !Array.isArray(data.session?.samples))
            throw new Error(
              "Backup non valido. Usa un’esportazione di Telemetry Lab.",
            );
          const samples = parseCSV(
            Papa.unparse(
              data.session.samples.map((r) => ({
                ...r,
                ax: r.acc_x,
                ay: r.acc_y,
                az: r.acc_z,
                acc_x: undefined,
                acc_y: undefined,
                acc_z: undefined,
              })),
            ),
          );
          last = {
            ...fresh(samples, String(data.session.name || file.name), "Backup"),
            notes: String(data.session.notes || ""),
          };
        } else
          last = fresh(
            parseCSV(text),
            file.name.replace(/\.[^.]+$/, ""),
            "CSV",
          );
        await saveSession(last);
      }
      await refresh();
      if (last) open(last);
    });
  };
  const stop = () => {
    recordingRef.current = false;
    setRecording(false);
    if (buffer.current.length) {
      open(
        fresh(
          [...buffer.current],
          `Uscita ${new Date().toLocaleString("it-IT")}`,
          endpoint,
        ),
      );
    } else
      setError("Nessun campione ricevuto. Controlla collegamento e firmware.");
  };
  const connect = () =>
    run(async () => {
      const url = new URL(endpoint);
      if (!["ws:", "wss:"].includes(url.protocol))
        throw new Error("Inserisci un indirizzo ws:// o wss://.");
      if (location.protocol === "https:" && url.protocol === "ws:")
        throw new Error(
          "Per l’ESP32 con ws:// avvia l’app su localhost. Una pagina HTTPS richiede wss://.",
        );
      setConnection("connecting");
      origin.current = null;
      const started = Date.now();
      const ws = new WebSocket(url);
      socket.current = ws;
      const timeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.close();
          setError("Connessione scaduta. Verifica rete Wi-Fi e indirizzo.");
        }
      }, 10000);
      ws.onopen = () => {
        clearTimeout(timeout);
        setConnection("connected");
      };
      ws.onmessage = (event) => {
        if (typeof event.data !== "string") return;
        const r = parseMessage(event.data, Date.now() - started);
        if (!r) return;
        latestRef.current = r;
        if (recordingRef.current) {
          if (origin.current === null) origin.current = r.timestamp_ms;
          const ms = Math.max(0, r.timestamp_ms - origin.current);
          if (buffer.current.length >= 500000) {
            stop();
            setError(
              "Raggiunto il limite di 500.000 campioni. Salva questa sessione e avviane un’altra.",
            );
            return;
          }
          buffer.current.push({
            ...r,
            timestamp_ms: ms,
            timestamp_s: ms / 1000,
          });
        }
      };
      ws.onerror = () =>
        setError(
          "Collegamento non riuscito. Verifica che il dispositivo o il ponte locale sia attivo.",
        );
      ws.onclose = () => {
        clearTimeout(timeout);
        setConnection("disconnected");
        socket.current = null;
        if (recordingRef.current) stop();
      };
    });
  const demo = () =>
    run(async () => {
      const response = await fetch("/demo.csv");
      if (!response.ok) throw new Error("Esempio non disponibile.");
      open(
        fresh(
          parseCSV(await response.text()),
          "Garda · sessione dimostrativa",
          "Dati simulati",
        ),
      );
    });
  const selected = useMemo(
    () =>
      session?.samples.filter(
        (r) => r.timestamp_s >= range[0] && r.timestamp_s <= range[1],
      ) || [],
    [session, range],
  );
  const gps = useMemo(() => selected.filter(hasGps), [selected]);
  const imu = useMemo(() => selected.filter(hasImu), [selected]);
  const stats = useMemo(() => metrics(selected), [selected]);
  const total = session?.samples.at(-1)?.timestamp_s || 0;
  const current = selected[Math.min(cursor, Math.max(0, selected.length - 1))];
  const exportSession = () =>
    download(`${session.name}.json`, JSON.stringify({ version: 1, session }));
  return (
    <div className="lab-shell">
      <aside className="lab-sidebar">
        <a
          className="lab-brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setView("acquisition");
          }}
        >
          <img src="/logo.png" alt="Sapienza Foiling Team" />
          <span>
            SFT<span>Telemetry Lab</span>
          </span>
        </a>
        <p className="sidebar-label">AREA DI LAVORO</p>
        <nav aria-label="Navigazione principale">
          {[
            ["acquisition", Radio, "Acquisizione"],
            ["archive", FolderOpen, "Sessioni"],
            ["analysis", Activity, "Analisi"],
          ].map(([key, Icon, label]) => (
            <button
              key={key}
              className={view === key ? "active" : ""}
              onClick={() => setView(key)}
              aria-current={view === key ? "page" : undefined}
            >
              <Icon size={19} />
              {label}
              {key === "archive" && <small>{sessions.length}</small>}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className={`status-dot ${connection}`} />
          {connection === "connected"
            ? "Elettronica collegata"
            : connection === "connecting"
              ? "Connessione in corso"
              : "Elettronica scollegata"}
          <p>
            Sapienza Foiling Team
            <br />
            Telemetria e studio delle uscite
          </p>
        </div>
      </aside>
      <main className="lab-main">
        <header className="lab-header">
          <div>
            <p className="eyebrow">SAPIENZA FOILING TEAM / TELEMETRY LAB</p>
            <h1>
              {view === "acquisition"
                ? "Dall’acqua ai dati."
                : view === "archive"
                  ? "Le tue sessioni."
                  : "Studia ogni uscita."}
            </h1>
            <p>
              {view === "acquisition"
                ? "Collega l’elettronica, registra un’uscita o importa i dati dalla SD."
                : view === "archive"
                  ? "Ritrova le uscite salvate, aggiungi osservazioni e torna ai dati."
                  : "Percorso, velocità e assetto, nello stesso spazio di lavoro."}
            </p>
          </div>
          <label className="button primary import-button">
            <Upload size={17} />
            Importa sessioni
            <input
              type="file"
              accept=".csv,.smc,.json"
              multiple
              onChange={importFile}
            />
          </label>
        </header>
        {error && (
          <div role="alert" className="message error">
            {error}
            <button aria-label="Chiudi errore" onClick={() => setError("")}>
              ×
            </button>
          </div>
        )}
        {notice && (
          <div role="status" className="message">
            {notice}
          </div>
        )}
        {view === "acquisition" && (
          <>
            <div className="acquisition-grid">
              <section className="panel connect-panel">
                <p className="eyebrow">01 / ACQUISIZIONE LIVE</p>
                <Radio size={32} className="brand-icon" />
                <h2>Collega l’elettronica</h2>
                <p>
                  Entra nella rete Wi-Fi dell’ESP32 e inserisci il suo
                  indirizzo. Puoi anche usare il ponte locale del team.
                </p>
                <label className="field">
                  Indirizzo WebSocket
                  <input
                    value={endpoint}
                    disabled={connection !== "disconnected"}
                    onChange={(e) => setEndpoint(e.target.value)}
                    placeholder="ws://192.168.4.1:81"
                  />
                </label>
                <div className="button-row">
                  <button
                    className="button primary"
                    disabled={connection === "connecting"}
                    onClick={
                      connection === "connected"
                        ? () => socket.current?.close()
                        : connect
                    }
                  >
                    {connection === "connected"
                      ? "Disconnetti"
                      : connection === "connecting"
                        ? "Collegamento…"
                        : "Collega dispositivo"}
                  </button>
                  {connection === "connected" && (
                    <button
                      className="button"
                      onClick={
                        recording
                          ? stop
                          : () => {
                              buffer.current = [];
                              origin.current = null;
                              recordingRef.current = true;
                              setRecording(true);
                              setCount(0);
                            }
                      }
                    >
                      {recording ? <Square size={16} /> : <Circle size={16} />}
                      {recording
                        ? "Termina registrazione"
                        : "Registra sessione"}
                    </button>
                  )}
                </div>
                <p className="helper">
                  ESP32 browser-logger: ws://192.168.4.1:81
                  <br />
                  Ponte UDP del team: ws://localhost:8001
                </p>
                <div className="live-strip">
                  <span
                    className={`status-dot ${recording ? "recording" : connection}`}
                  />
                  <strong>
                    {recording
                      ? "Registrazione in corso"
                      : connection === "connected"
                        ? "In ascolto"
                        : "In attesa del dispositivo"}
                  </strong>
                  <span>{count.toLocaleString("it-IT")} campioni</span>
                </div>
                {latest && (
                  <div className="live-values">
                    <span>
                      Roll <b>{latest.roll_deg?.toFixed(1) ?? "—"}°</b>
                    </span>
                    <span>
                      Pitch <b>{latest.pitch_deg?.toFixed(1) ?? "—"}°</b>
                    </span>
                    <span>
                      GPS <b>{latest.satellites ?? "—"} sat.</b>
                    </span>
                  </div>
                )}
              </section>
              <section className="panel import-panel">
                <p className="eyebrow">02 / DOPO L’USCITA</p>
                <FolderOpen size={32} className="brand-icon" />
                <h2>Porta una sessione nel Lab</h2>
                <p>
                  Importa CSV GPS, IMU o una sessione completa dell’ESP32. I
                  dati restano disponibili nell’archivio di questo browser.
                </p>
                <label className="drop-zone">
                  <Upload size={28} />
                  <strong>Scegli i file della sessione</strong>
                  <span>CSV, SMC o backup JSON · anche più file</span>
                  <input
                    type="file"
                    accept=".csv,.smc,.json"
                    multiple
                    onChange={importFile}
                  />
                </label>
                <button className="text-button" onClick={demo}>
                  Esplora una sessione di esempio <ArrowUpRight size={16} />
                </button>
              </section>
            </div>
            <section className="workflow">
              <div>
                <span>01</span>
                <h3>Acquisisci</h3>
                <p>Telemetria live o file dalla SD.</p>
              </div>
              <div>
                <span>02</span>
                <h3>Conserva</h3>
                <p>Sessioni nominate, note e backup.</p>
              </div>
              <div>
                <span>03</span>
                <h3>Studia</h3>
                <p>Grafici, mappa e intervalli di tempo.</p>
              </div>
            </section>
          </>
        )}
        {view === "archive" && (
          <section className="panel">
            <div className="section-heading">
              <h2>
                Archivio sessioni <small>{sessions.length}</small>
              </h2>
              <label className="search">
                Cerca sessioni
                <input
                  type="search"
                  placeholder="Nome o note…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
            </div>
            <p className="helper">
              Salvate solo in questo browser e su questo indirizzo. Esporta un
              backup prima di cancellare i dati del browser.
            </p>
            <div className="session-list">
              {sessions
                .filter((s) =>
                  `${s.name} ${s.notes}`
                    .toLowerCase()
                    .includes(query.toLowerCase()),
                )
                .map((s) => (
                  <article className="session-row" key={s.id}>
                    <div>
                      <span className="eyebrow">
                        {s.source === "Dati simulati"
                          ? "SIMULAZIONE"
                          : new Date(s.createdAt).toLocaleDateString("it-IT")}
                      </span>
                      <h3>{s.name}</h3>
                      <p>
                        {s.samples.length.toLocaleString("it-IT")} campioni ·{" "}
                        {duration(metrics(s.samples).duration)}
                        {s.notes && ` · ${s.notes.slice(0, 90)}`}
                      </p>
                    </div>
                    <div className="button-row">
                      <button className="button" onClick={() => open(s)}>
                        Apri analisi <ArrowUpRight size={16} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`Elimina ${s.name}`}
                        onClick={() => {
                          if (
                            confirm(
                              `Eliminare “${s.name}” dall’archivio locale?`,
                            )
                          )
                            run(async () => {
                              await deleteSession(s.id);
                              await refresh();
                            });
                        }}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </article>
                ))}
            </div>
            {!sessions.length && (
              <div className="empty">
                <FolderOpen size={36} />
                <h3>La prima uscita parte da qui</h3>
                <p>
                  Importa un file o registra dall’elettronica per creare
                  l’archivio.
                </p>
                <button
                  className="button"
                  onClick={() => setView("acquisition")}
                >
                  Vai all’acquisizione
                </button>
              </div>
            )}
          </section>
        )}
        {view === "analysis" &&
          (!session ? (
            <section className="panel empty">
              <Activity size={36} />
              <h2>Apri una sessione da studiare</h2>
              <p>
                Importa i dati, scegli una sessione dall’archivio o prova
                l’esempio.
              </p>
              <div className="button-row">
                <button
                  className="button primary"
                  onClick={() => setView("archive")}
                >
                  Apri archivio
                </button>
                <button className="button" onClick={demo}>
                  Prova l’esempio
                </button>
              </div>
            </section>
          ) : (
            <>
              <section className="panel session-details">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">
                      {session.source === "Dati simulati"
                        ? "SESSIONE DIMOSTRATIVA / DATI SIMULATI"
                        : `SESSIONE / ${session.source}`}
                    </p>
                    <label className="field">
                      Nome sessione
                      <input
                        value={session.name}
                        onChange={(e) =>
                          setSession({ ...session, name: e.target.value })
                        }
                      />
                    </label>
                  </div>
                  <div className="button-row">
                    <button className="button primary" onClick={persist}>
                      <Save size={16} />
                      Salva sessione
                    </button>
                    <button className="button" onClick={exportSession}>
                      <Download size={16} />
                      Backup
                    </button>
                    <button
                      className="button"
                      onClick={() =>
                        download(
                          `${session.name}-intervallo.csv`,
                          Papa.unparse(
                            selected.map((r) => ({
                              ...r,
                              ax: r.acc_x,
                              ay: r.acc_y,
                              az: r.acc_z,
                              acc_x: undefined,
                              acc_y: undefined,
                              acc_z: undefined,
                            })),
                          ),
                          "text/csv",
                        )
                      }
                    >
                      Esporta intervallo
                    </button>
                  </div>
                </div>
                <label className="field">
                  Note sull’uscita
                  <textarea
                    placeholder="Condizioni, configurazione del foil, manovre da rivedere…"
                    value={session.notes}
                    onChange={(e) =>
                      setSession({ ...session, notes: e.target.value })
                    }
                  />
                </label>
              </section>
              <div className="metric-grid">
                {[
                  ["Durata selezionata", duration(stats.duration)],
                  [
                    "Velocità massima",
                    stats.maxSpeed === null
                      ? "—"
                      : `${stats.maxSpeed.toFixed(1)} kn`,
                  ],
                  [
                    "Velocità media¹",
                    stats.avgSpeed === null
                      ? "—"
                      : `${stats.avgSpeed.toFixed(1)} kn`,
                  ],
                  ["Distanza GPS", `${stats.distance.toFixed(2)} km`],
                ].map(([label, value]) => (
                  <div className="metric" key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              <section className="panel timeline">
                <div className="section-heading">
                  <h2>Intervallo di studio</h2>
                  <button
                    className="text-button"
                    onClick={() => {
                      setRange([0, Infinity]);
                      setCursor(0);
                    }}
                  >
                    Mostra tutta la sessione
                  </button>
                </div>
                <div className="range-fields">
                  <label className="field">
                    Da (secondi)
                    <input
                      type="number"
                      min="0"
                      max={Math.min(range[1], total)}
                      value={range[0]}
                      onChange={(e) => {
                        setRange([
                          Math.max(
                            0,
                            Math.min(+e.target.value, range[1], total),
                          ),
                          range[1],
                        ]);
                        setCursor(0);
                      }}
                    />
                  </label>
                  <label className="field">
                    A (secondi)
                    <input
                      type="number"
                      min={range[0]}
                      max={total}
                      value={Number.isFinite(range[1]) ? range[1] : total}
                      onChange={(e) => {
                        setRange([
                          range[0],
                          Math.max(range[0], Math.min(total, +e.target.value)),
                        ]);
                        setCursor(0);
                      }}
                    />
                  </label>
                  <span>
                    {selected.length.toLocaleString("it-IT")} campioni
                  </span>
                </div>
                <label className="field">
                  Esplora il tempo · {current?.timestamp_s.toFixed(2) ?? "—"} s
                  <input
                    type="range"
                    min="0"
                    max={Math.max(0, selected.length - 1)}
                    value={Math.min(cursor, Math.max(0, selected.length - 1))}
                    onChange={(e) => {
                      setCursor(+e.target.value);
                      setHover(null);
                    }}
                  />
                </label>
                <p className="helper">
                  Campione selezionato: roll{" "}
                  {current?.roll_deg?.toFixed(1) ?? "—"}° · pitch{" "}
                  {current?.pitch_deg?.toFixed(1) ?? "—"}° · velocità{" "}
                  {current?.speed_knots?.toFixed(1) ?? "—"} kn. ¹ Media dei
                  campioni GPS disponibili.
                </p>
              </section>
              {gps.length > 0 && (
                <section className="panel">
                  <h2 className="chart-heading">Percorso GPS</h2>
                  <Suspense fallback={<p role="status">Caricamento mappa…</p>}>
                    <MapTracker
                      gpsData={gps}
                      activeDataPoint={
                        hover || (hasGps(current || {}) ? current : null)
                      }
                    />
                  </Suspense>
                  <div className="chart-block">
                    <Suspense
                      fallback={<p role="status">Caricamento grafici…</p>}
                    >
                      <GpsCharts data={gps} onHoverData={setHover} />
                    </Suspense>
                  </div>
                </section>
              )}
              {imu.length > 0 && (
                <section className="panel">
                  <Suspense
                    fallback={<p role="status">Caricamento grafici…</p>}
                  >
                    <ImuCharts data={imu} />
                  </Suspense>
                </section>
              )}
              {!selected.length && (
                <div className="panel empty">
                  Nessun campione in questo intervallo.
                </div>
              )}
            </>
          ))}
        <footer className="lab-footer">
          SFT Telemetry Lab
          <span>Archivio locale · esportazione CSV e JSON</span>
        </footer>
      </main>
    </div>
  );
}
export default App;
