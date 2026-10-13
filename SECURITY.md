# Segnalare problemi di sicurezza

Non pubblicare credenziali, sessioni GPS reali o dettagli di una vulnerabilità sfruttabile in una issue pubblica. Usa la segnalazione privata delle vulnerabilità in GitHub, se disponibile, oppure contatta privatamente un maintainer dell'organizzazione Sapienza Foiling Team e concorda il canale di invio.

La webapp conserva dati in IndexedDB locale; cancellare i dati del browser elimina l'archivio. Non esistono account o sincronizzazione server nella versione iniziale. Il WebSocket locale non offre autenticazione o cifratura: usa il dispositivo/bridge solo nelle reti previste dal team. Le mappe caricano tile da OpenStreetMap e i font da Google Fonts.

Prima di introdurre servizi cloud o comandi verso l'elettronica è necessario progettare autenticazione, autorizzazione, isolamento delle sessioni e gestione delle credenziali.
