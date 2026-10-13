# Verifica e matrice di compatibilità

## Automatico

`npm ci`, `npm run lint`, `npm test`, `npm run build`. La CI esegue gli stessi passi senza hardware. I test verificano CSV GPS/IMU/combinati, protocollo D, conversioni, esportazione/reimportazione, errori e passaggio di mezzanotte.

## Browser

1. Apri l'esempio; verifica mappa, velocità e assetto.
2. Aggiungi nome/note, salva, ricarica e riapri dall'archivio.
3. Seleziona un intervallo; verifica quantità di campioni e tempi.
4. Esporta CSV e backup JSON e reimporta; verifica unità e note.
5. Verifica 390px e desktop, tastiera, focus e messaggi di errore.
6. Collega un WebSocket simulato con messaggi D, registra, termina e verifica i dati ricevuti.

## Hardware

| Variante                         | Trasporto               | Supporto app                   | Prova fisica di questa webapp  |
| -------------------------------- | ----------------------- | ------------------------------ | ------------------------------ |
| browser-logger                   | WebSocket diretto D/GPS | Implementato e simulato        | Da eseguire                    |
| telemetry-sd / bridge serverw.py | UDP → WebSocket IMU/GPS | Parser implementato            | Da eseguire                    |
| CSV SD                           | Importazione            | Formato testato sinteticamente | Da eseguire con sessione reale |

Per ogni prova fisica registra commit firmware/webapp, dispositivo, alimentazione, sensori, durata, frequenza, numero di campioni attesi/ricevuti, disconnessioni e risultato di backup/ripristino. Non pubblicare coordinate reali per documentare una prova.
