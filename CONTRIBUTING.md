# Contribuire a SFT Telemetry Lab

Questa è la webapp della piattaforma telemetrica del Sapienza Foiling Team. Firmware e bridge sono in [sft-telemetry](https://github.com/sapienzafoilingteam/sft-telemetry). Il progetto è nella fase iniziale: i contratti attuali e i limiti sono documentati, e vanno migliorati attraverso cambiamenti piccoli e verificabili.

## Primo contributo

```sh
git clone https://github.com/sapienzafoilingteam/sft-telemetry-lab.git
cd sft-telemetry-lab
nvm use
npm ci
npm run dev
```

Apri l'app e scegli la sessione dimostrativa. Non serve hardware per lavorare su importazione, archivio, grafici e interfaccia. Crea un branch come `fix/csv-validation` o `feat/session-comparison`. I membri con permesso di scrittura possono usare branch nella repo; gli altri un fork. Apri una PR verso `main`.

Prima della PR:

```sh
npm run lint
npm test
npm run build
```

Per modifiche all'interfaccia verifica desktop e mobile, navigazione da tastiera e assenza di scorrimento orizzontale. Per parser, storage, unità o protocolli aggiungi una prova che riproduca il problema. I test non devono dipendere da un ESP32 o da servizi esterni.

## Dove lavorare

- `src/lib/telemetry.js`: adattatori, unità canoniche e metriche.
- `src/lib/storage.js`: persistenza locale IndexedDB.
- `src/App.jsx`: flusso acquisizione → archivio → analisi.
- `src/components/`: grafici e mappa.
- `tests/`: regressioni dei formati e delle unità.
- `scripts/`: generatori di dati sintetici.
- `docs/`: architettura, protocolli, roadmap e prove.

Non cambiare il significato o l'unità di un campo senza documentare la compatibilità e aggiungere test. Non migrare o cancellare l'archivio locale per risolvere un problema: progetta una migrazione esplicita, con backup e test di ripristino. Mantieni separati dati acquisiti, dati derivati e simulazioni.

## Pull request

Spiega problema, comportamento risultante, verifiche e limiti. Collega una issue quando esiste. Per modifiche visuali aggiungi screenshot desktop/mobile; per prove hardware indica firmware, versione, scheda e sensori, trasporto e risultato. Compilazione, simulazione e prova fisica sono evidenze diverse.

Una modifica che tocca il protocollo va coordinata con una issue/PR nella repo del firmware. Non integrare automaticamente feature sperimentali nel contratto stabile. Per nuove librerie o scelte infrastrutturali descrivi necessità, manutenzione e alternativa più semplice.

## Dati e collaborazione

Non committare credenziali, sessioni reali, posizioni GPS personali o log di dispositivi non ripuliti. Usa campioni sintetici e dichiarali tali. Non cambiare il logo del team senza concordarlo. Rispetta le licenze delle dipendenze.

Confrontati sul comportamento osservabile e sul codice; documenta decisioni e motivazioni nelle issue. Le assegnazioni e le priorità appartengono al team, non ai generatori automatici.

## Licenza

La repository è pubblica, ma il team non ha ancora scelto una licenza generale. La visibilità pubblica non equivale a una licenza open source. La scelta della licenza e delle condizioni di contributo è una decisione dei responsabili del team; fino ad allora non promettere diritti di riuso che non sono stati concessi.
