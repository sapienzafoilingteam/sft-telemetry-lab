# Roadmap verso telemetria end to end

L'obiettivo è una catena verificabile: sensori → trasporto → registrazione → archivio → analisi → confronto. Il nome del prodotto non è una prova che questa catena sia già completa.

## P0 · Base affidabile per contribuire

- [x] Acquisizione WebSocket e adattatori per formati firmware esistenti.
- [x] Importazione, archivio locale con note, esportazione e intervalli.
- [x] Test parser/unità, installazione riproducibile e CI.
- [ ] Scegliere licenza e responsabilità di manutenzione con il team.
- [x] Importazione e roundtrip del SMC binario osservato, con fixture sintetiche.
- [ ] Confermare specifica SMC e velocità con il logger SuMoth prima di produrre nuovi file per l’elettronica.
- [ ] Definire unità, clock e validità GPS comuni con la repo firmware.
- [ ] Salvare registrazioni a blocchi e recuperarle dopo crash.
- [ ] Misurare perdita pacchetti, gap, riavvii e riconnessioni.

Criterio di completamento: una sessione sintetica lunga e una sessione fisica documentata attraversano acquisizione, salvataggio, riapertura ed esportazione senza perdita silenziosa.

## P1 · Strumento di lavoro in acqua e a terra

- [ ] Metadata: dispositivo, firmware, sensori, calibrazione, barca, velista, condizioni e configurazione.
- [ ] Sincronizzazione GPS/IMU con origine temporale esplicita.
- [ ] Riproduzione temporale e selezione condivisa tra mappa e tutti i grafici.
- [ ] Annotazioni su intervalli e confronto tra due sessioni.
- [ ] Indicatori di qualità GPS/IMU e metriche pesate sul tempo.
- [ ] Benchmark con registrazioni lunghe; separare parsing e rendering.
- [ ] Funzionamento offline documentato e risorse locali.

Criterio di completamento: il team confronta due uscite e riconduce una metrica ai campioni originali, con unità, intervallo e qualità visibili.

## P2 · Collaborazione e piattaforma

- [ ] ADR su backend, storage e formato portabile delle sessioni.
- [ ] Archivio condiviso con ruoli, autenticazione, backup e ripristino verificato.
- [ ] API/SDK e schema versionati; adattatori per altri dispositivi.
- [ ] Analisi riproducibili con versione dell'algoritmo e provenienza dei dati.
- [ ] Release coordinate con firmware, changelog e matrice di compatibilità.

Criterio di completamento: più membri del team lavorano sulla stessa sessione con controllo accessi, tracciabilità e recupero dei dati.

Le priorità vanno concordate nelle issue. La pianificazione non comprende date di consegna o validazioni hardware già avvenute.
