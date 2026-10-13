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

## Contratto futuro

Prima di introdurre un protocollo comune definire: versione, boot/session ID, clock monotono e UTC, contatore di sequenza, validità e età del fix, unità dichiarate, scala/calibrazione dei sensori, versione firmware, frequenza nominale e segnali di perdita. Aggiungere fixture di riferimento usate da entrambe le repo e test di compatibilità prima del rilascio.
