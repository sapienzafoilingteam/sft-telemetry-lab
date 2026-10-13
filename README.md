# SFT Telemetry Lab

Webapp del Sapienza Foiling Team per collegare l’elettronica, registrare e archiviare le uscite e studiare telemetria GPS e IMU.

Parte della piattaforma [SFT Telemetry](https://github.com/sapienzafoilingteam/sft-telemetry). L'obiettivo è il software di riferimento del team per la telemetria end to end. La versione iniziale offre acquisizione e archivio **locali**; sincronizzazione team, recupero dopo crash e contratto comune dei dispositivi sono ancora da realizzare.

[Contribuire](CONTRIBUTING.md) · [Architettura](docs/ARCHITECTURE.md) · [Protocolli](docs/PROTOCOL.md) · [Roadmap](docs/ROADMAP.md) · [Verifiche](docs/TESTING.md) · [Sicurezza](SECURITY.md)

## Avvio

Richiede Node.js 22 e npm. Nella cartella del progetto:

```sh
npm ci
npm run dev -- --host 127.0.0.1
```

Apri http://127.0.0.1:5173. Per verificare il progetto: `npm run lint`, `npm test` e `npm run build`.

## Acquisizione

- Con il firmware `esp32-imu/firmware/browser-logger`, entra nella rete dell’ESP32 e collega `ws://192.168.4.1:81`.
- Con il firmware `telemetry-sd`, avvia il ponte UDP/WebSocket esistente `esp32-imu/dashboard/serverw.py` e collega `ws://localhost:8001`. Questa app riceve `IMU,roll,pitch,yaw` e `GPS,sats,lat,lon`: il ponte non fornisce tutte le metriche dei file SD. Il tempo in questo caso è quello di ricezione nel browser.
- Premi **Registra sessione**, poi **Termina registrazione** e **Salva sessione**. La disconnessione apre i campioni già ricevuti per consentire il salvataggio. Limite: 500.000 campioni per registrazione. I dati ancora in registrazione sono in memoria: non chiudere la pagina prima di terminare e salvare.
- Gli indirizzi `ws://` richiedono l’app su localhost o HTTP. Per una pagina HTTPS serve un dispositivo o ponte con `wss://`.

L’app riceve dati; non invia comandi alla scheda e non avvia la registrazione sulla SD. Non usa il vecchio server Go con porta seriale fissata nel codice.

## Archivio

Importa CSV/SMC GPS o IMU, CSV completi dell’ESP32 oppure backup JSON di Telemetry Lab. Ogni file importato crea una sessione indipendente; i file GPS e IMU separati non vengono sincronizzati automaticamente.

Le sessioni sono conservate in IndexedDB nel browser e nell’origine usata (protocollo, host e porta). Non esiste sincronizzazione cloud. **Backup** esporta dati, nome e note in JSON; puoi reimportarlo anche in un altro browser. La cancellazione dei dati del browser elimina l’archivio locale.

## Analisi

Mappa, grafici sincronizzati sul tempo, statistiche e selezione di un intervallo. Il cursore mostra il campione e la sua posizione quando contiene GPS valido. L’hover sui grafici GPS evidenzia la posizione associata sulla mappa. L’esportazione CSV include tutti i campioni dell’intervallo; il downsampling riguarda soltanto grafici e percorso renderizzato.

- Velocità: nodi. `gps_speed`/`speed` del firmware sono convertiti da km/h.
- Accelerazioni: g. `ax/ay/az` del firmware sono già in g; i CSV legacy con `acc_x/y/z` sono interpretati in m/s² e convertiti. L’esportazione usa `ax/ay/az` per conservare l’unità senza doppia conversione.
- Altitudine GPS: quota riportata dal sensore, non misura affidabile dell’altezza di volo del foil.
- Distanza: somma delle distanze geodetiche fra fix GPS validi; non filtrata per salti o rumore GPS.
- Velocità media: media aritmetica dei campioni disponibili, non media pesata sul tempo.
- CSV ECK1 senza intestazione: data, ora, latitudine, longitudine, velocità in nodi, satelliti. La risoluzione temporale resta quella del file.

Le mappe di base richiedono internet (OpenStreetMap); analisi e archivio non richiedono un backend. L’esempio incluso contiene dati simulati del Garda.

## Stato e licenza

La webapp principale è React in `src/`. Le precedenti implementazioni Go/vanilla e i tracciati GPS reali rimangono fuori dalla repository pubblica. I CSV `dummy_*` e l'esempio incluso sono sintetici.

La repository è pubblica; una licenza generale deve ancora essere scelta dai responsabili del team. Vedi [CONTRIBUTING.md](CONTRIBUTING.md).
