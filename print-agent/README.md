# SebPhone Print Agent

Agent local Node.js qui reçoit les tickets de vente en JSON depuis l'app SebPhone
(navigateur) et les envoie à une imprimante thermique **Rongta 80mm** (ou tout modèle
compatible ESC/POS EPSON) via TCP/IP.

## Prérequis

- **Node.js 18+** installé sur le poste de caisse.
- Une imprimante thermique **80mm** avec interface réseau Ethernet ou WiFi,
  compatible protocole **ESC/POS EPSON** (Rongta RP80/RP325, Xprinter XP-N160II,
  Epson TM-T20/T88, etc.).
- Poste de caisse et imprimante sur le **même réseau LAN**.

## Configuration imprimante Rongta 80mm

1. Branche l'imprimante en Ethernet au routeur (ou active le WiFi selon modèle).
2. Récupère son adresse IP :
   - Éteins l'imprimante.
   - Maintiens le bouton **FEED** et rallume : elle imprime un ticket de config
     avec son IP (ex : `192.168.1.87`).
3. Vérifie que le port TCP par défaut est `9100` (standard ESC/POS).
4. Depuis un poste du même réseau, teste avec :
   ```bash
   ping 192.168.1.87
   ```

## Installation

```bash
cd print-agent
npm install
```

## Lancement

### Développement (foreground)

```bash
npm start
```

Sortie attendue :
```
Agent d'impression SebPhone actif sur http://localhost:4000
Cible imprimante: 192.168.1.87:9100
```

### Production (background avec PM2)

PM2 garde le service actif au démarrage du poste :

```bash
npm install -g pm2
pm2 start server.js --name sebphone-print-agent
pm2 save
pm2 startup   # suit les instructions pour activer au boot
```

Commandes utiles :
```bash
pm2 status                        # état
pm2 logs sebphone-print-agent     # logs live
pm2 restart sebphone-print-agent  # redémarre
pm2 stop sebphone-print-agent     # arrête
```

## Variables d'environnement

| Variable       | Défaut            | Description                              |
|----------------|-------------------|------------------------------------------|
| `PRINTER_IP`   | `192.168.1.87`    | IP de l'imprimante thermique             |
| `PRINTER_PORT` | `9100`            | Port TCP ESC/POS (standard = 9100)       |
| `AGENT_PORT`   | `4000`            | Port HTTP local du serveur agent         |

Exemple :
```bash
PRINTER_IP=192.168.0.50 PRINTER_PORT=9100 npm start
```

Ou avec PM2 :
```bash
pm2 start server.js --name sebphone-print-agent \
  --env PRINTER_IP=192.168.0.50
```

## Endpoints HTTP

### `GET /health`

Vérifie que l'imprimante est joignable.

```bash
curl http://localhost:4000/health
```

Réponse :
```json
{
  "ok": true,
  "printerIp": "192.168.1.87:9100",
  "printerConnected": true
}
```

### `POST /print`

Envoie un ticket à l'imprimante. Body JSON attendu :

```json
{
  "companyName": "SLT GROUP (SRL)",
  "tva": "BE 1028.764.677",
  "caisseNom": "molenbeek",
  "dateTime": "01/08/2026 14:32:17",
  "ticketNumber": 42,
  "items": [
    { "name": "Coque iPhone 15", "qty": 1, "total": 15.00 },
    { "name": "Vitre protection",  "qty": 2, "total": 20.00 }
  ],
  "reglements": [
    { "mode": "Cash",       "montant": 30.00 },
    { "mode": "Bancontact", "montant": 5.00 }
  ],
  "tvaRate": 21
}
```

Réponse succès :
```json
{ "ok": true }
```

Réponse erreur (ex : imprimante hors-ligne) :
```json
{ "ok": false, "error": "Imprimante injoignable sur 192.168.1.87:9100" }
```

## Intégration côté app SebPhone

Le composant `StockMagasin.jsx` appelle `printViaAgent(ticketData, fallback)` au
clic sur "Imprimer" dans le modal ticket. Si l'agent n'est pas joignable
(`http://localhost:4000` down), l'app bascule automatiquement sur
`window.print()` (impression navigateur classique du ticket rendu à l'écran).

## Dépannage

**Imprimante `Injoignable`**
- Vérifie l'IP via ticket de config (bouton FEED au démarrage).
- Ping l'imprimante depuis le poste : `ping <IP>`.
- Vérifie qu'aucun firewall ne bloque le port 9100 sortant.

**Agent injoignable côté navigateur**
- Vérifie que PM2 tourne : `pm2 status`.
- Vérifie que le port 4000 est libre : `netstat -ano | findstr :4000` (Windows) ou `lsof -i :4000` (Mac/Linux).
- Le navigateur doit être sur le **même poste** que l'agent (fetch `localhost:4000`).

**Caractères accentués mal imprimés**
- L'option `removeSpecialCharacters: false` est déjà activée.
- Certaines Rongta requièrent de configurer la page de code CP858 ou CP1252 depuis
  leur utilitaire Windows fourni.
