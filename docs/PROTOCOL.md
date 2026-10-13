# Formati supportati e unità

Questa pagina descrive il codice attuale, non un nuovo protocollo imposto all'hardware.

## Campione normalizzato

`timestamp_ms` (millisecondi dall'inizio della sessione), `timestamp_s` (secondi), `lat`, `lon` (gradi), `speed_knots` (nodi), `altitude_m` (metri), `satellites`, `pitch_deg`, `roll_deg`, `yaw_deg` (gradi), `acc_x/y/z` (g), `gyro_x/y/z` (°/s). Campi assenti rimangono assenti. Un fix GPS valido ha coordinate finite nei limiti terrestri e non è `(0,0)`.

Attenzione: `acc_x/y/z` nei CSV legacy in ingresso sono in m/s², mentre lo schema interno è in g. Il CSV esportato usa `ax/ay/az` in g per evitare ambiguità in reimportazione. Il backup JSON conserva lo schema interno e la versione 1.

## ESP32 browser-logger

WebSocket dell'ESP32, tipicamente `ws://192.168.4.1:81`:

```text
D,timestamp_ms,roll,pitch,yaw,ax,ay,az,gx,gy,gz,mx,my,mz,lat,lng,alt,speed,sats
GPS,timestamp_ms,lat,lng,alt,speed,sats,fix
```

`speed` è km/h e viene convertita in nodi. Accelerazioni in g. I campi magnetometro vengono ricevuti ma non conservati nello schema attuale. `fix=0` rimuove le coordinate del messaggio GPS. I messaggi D non includono un flag di validità GPS: coordinate cache non dimostrano un fix aggiornato.

## Bridge UDP del team

Il server `dashboard/serverw.py` della repo firmware espone `ws://localhost:8001` e inoltra:

```text
IMU,roll,pitch,yaw
GPS,sats,lat,lon
```

Sono utilizzati timestamp di ricezione nel browser. `NO_FIX` non produce un punto GPS. Non ci sono velocità, quota, accelerazioni o giroscopio in questi messaggi. I messaggi STATUS e diagnostici non sono campioni.

## CSV

- Firmware SD: `timestamp_ms,roll,pitch,yaw,ax,ay,az,gx,gy,gz,mx,my,mz,gps_lat,gps_lng,gps_alt,gps_speed,gps_sats`.
- GPS con intestazione: `lat/lon` o `latitude/longitude`, `timestamp_ms` o `timestamp` in secondi, `speed_knots`.
- IMU legacy: `timestamp_ms,pitch_deg,roll_deg,yaw_deg,acc_x,acc_y,acc_z,gyro_x,gyro_y,gyro_z`.
- ECK1 senza intestazione: `YYYYMMDD,HHMMSS,lat,lon,speed_knots,satellites`.

L'importazione ordina sul timestamp e sottrae il primo tempo. File con errori di colonne o senza campioni validi sono respinti. Il formato ECK1 risolve il cambio di giorno usando data e ora; non può ricostruire la frazione di secondo assente nel file.

## SuMoth SMC binario · profilo osservato

Il team ha ricevuto il logger dall’organizzazione della SuMoth Challenge e recuperava i file dalla sua SD attraverso il Wi-Fi dell’ESP32, rete `SFT-Telemetry`. Questo flusso di download non dimostra che il logger esponga il WebSocket del firmware del team: endpoint e protocollo di trasferimento devono ancora essere verificati. Per ora scaricare il file dalla pagina del dispositivo e importarlo nel Lab.

Il file `.smc` fornito dal team è binario: non va passato a PapaParse. `src/lib/smc.js` riconosce il magic little endian `0x534d4331` (byte `31 43 4d 53`) e il profilo osservato con byte 4 = 3, byte 5 = 17 e byte 17 = 2.

La struttura seguente è ricostruita dal file, non è una specifica ufficiale del logger. I campi ancora sconosciuti restano opachi.

| Offset | Dimensione | Interpretazione osservata                                 |
| ------ | ---------- | --------------------------------------------------------- |
| 0      | 4          | Magic uint32 little endian                                |
| 4–5    | 2          | Discriminanti del profilo; significato da confermare      |
| 6      | 2          | Anno uint16 little endian                                 |
| 8–12   | 5          | Mese, giorno, ora, minuto, secondo                        |
| 13–16  | 4          | Identificativo ASCII del dispositivo/team                 |
| 17–19  | 3          | Campi opachi, byte 17 = 2 nel profilo osservato           |
| 20     | 4          | Numero di record uint32 little endian                     |
| 24–28  | 5          | Campi opachi: non assumere checksum, unità o calibrazione |

Dopo i 29 byte di intestazione seguono record da 14 byte:

| Offset nel record | Dimensione | Interpretazione                                         |
| ----------------- | ---------- | ------------------------------------------------------- |
| 0                 | 4          | Latitudine int32 little endian / 1.000.000              |
| 4                 | 4          | Longitudine int32 little endian / 1.000.000             |
| 8                 | 2          | Velocità uint16 little endian, unità **non confermata** |
| 10–12             | 3          | Ora, minuto, secondo                                    |
| 13                | 1          | Numero di satelliti                                     |

La sessione conserva `smc.headerBytes`, `smc.date`, `smc.deviceId`, `smc.speedUnit` e per ogni campione `smc_lat_e6`, `smc_lon_e6`, `smc_clock_s`, `speed_raw`. L'archivio/backup conserva questi valori per il roundtrip. Non contiene IMU o altitudine.

La precisione temporale è un secondo; non distribuire artificialmente i record duplicati nel secondo. L'ordine del file resta invariato; un salto indietro inferiore a 12 ore è respinto, uno maggiore viene interpretato come cambio di giorno. Il fuso dell'orario dispositivo non è dichiarato. Nei record con zero satelliti o coordinate `(0,0)` il punto mappa non viene creato, ma il campione grezzo resta conservato. Un numero positivo di satelliti da solo non certifica la qualità del fix.

L’unità **mm/s** è stata verificata confrontando tutti i 39.145 record con l’esportazione CSV della [dashboard ufficiale SuMoth](https://gps.sumoth.org/dashboard.php): velocità CSV = valore binario × 0,0036, in km/h con due decimali. Coordinate, orari e satelliti corrispondono per tutti i record. Il CSV dichiara `RATE:2Hz VERSION:SMC3`; la pagina riporta 16,0 kn massimi e 2,7 kn medi per il file di riferimento. I nuovi import SMC usano quindi mm/s e vengono convertiti in nodi; i valori grezzi restano conservati. Un backup precedente mantiene l’interpretazione scelta, anche se impostata a nessuna conversione. Questa verifica riguarda il profilo osservato, non le varianti sconosciute.

Il CSV ufficiale contiene una riga iniziale `#DEVICE:… RATE:2Hz VERSION:SMC3`, record `YYYYMMDD,HHMMSS,lat,lon,speed_kmh,satellites` e un commento finale `#CRC32:…`. Il parser riconosce il metadato e converte da km/h; il CSV ECK1 privo del metadato continua a usare nodi. Il checksum CSV non è verificato: il commento finale viene ignorato e non va confuso con i campi opachi del binario. La dashboard presenta gli orari come UTC; nel binario il fuso rimane non dichiarato.

**Esporta SMC originale** ricostruisce l'intera registrazione preservando intestazione e record. Non esporta un intervallo o nuove registrazioni live in questo formato: modificare i campi opachi senza la specifica potrebbe produrre un file incompatibile. Gli intervalli si esportano in CSV con `speed_raw` e, se scelta, `speed_knots`. La specifica ufficiale è necessaria prima di promettere la produzione di nuovi SMC per l'elettronica.

`public/demo.smc` e `tests/fixtures/sumoth-synthetic.smc` sono esempi completamente sintetici generati con `node scripts/generate_smc_fixture.js`. Riproducono la struttura osservata, con campi opachi fittizi; non sono registrazioni reali né output certificati del logger. La registrazione originale resta fuori da Git.

## Contratto futuro

Prima di introdurre un protocollo comune definire: versione, boot/session ID, clock monotono e UTC, contatore di sequenza, validità e età del fix, unità dichiarate, scala/calibrazione dei sensori, versione firmware, frequenza nominale e segnali di perdita. Aggiungere fixture di riferimento usate da entrambe le repo e test di compatibilità prima del rilascio.
