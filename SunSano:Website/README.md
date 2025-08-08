# SunSano Webshop - Echte Zahlungsintegration

Ein professioneller Webshop für frische Säfte und Smoothies mit echter Stripe-Zahlungsintegration.

## 🚀 Features

### ✅ Implementiert
- **Echte Zahlungsverarbeitung** mit Stripe Integration
- **Sichere Backend-API** mit SQLite-Datenbank
- **Webhook-Verarbeitung** für automatische Bestellstatus-Updates
- **E-Mail-Benachrichtigungen** mit professionellen Templates
- **Responsive Design** für alle Geräte
- **Development-Fallback** funktioniert auch ohne Stripe-Keys

### 🔄 Geplant
- Admin-Dashboard für Bestellverwaltung
- PDF-Rechnungsgenerierung
- Analytics und Reporting
- Mobile App

## 🏗️ Architektur

```
SunSano:Website/
├── backend/           # Node.js + Express API
│   ├── database.js   # SQLite-Datenbank
│   ├── services/     # Business Logic
│   ├── routes/       # API Endpoints
│   └── middleware/   # Security & Error Handling
└── frontend/         # HTML/CSS/JS
    ├── index.html    # Hauptseite
    ├── payment-success.html
    └── payment-cancelled.html
```

## 🚀 Quick Start

### 1. Backend starten
```bash
cd backend
npm install
npm start
```

### 2. Frontend starten
```bash
cd frontend
python -m http.server 5000
# oder
npx serve .
```

### 3. Browser öffnen
```
http://localhost:5000
```

## 💳 Zahlungssystem

### Stripe Integration
- ✅ Echte Stripe Checkout Sessions
- ✅ Sichere Webhook-Verarbeitung
- ✅ Automatische Bestellstatus-Updates
- ✅ Fallback für Development ohne Keys

### Zahlungsflow
1. Kunde wählt Produkte
2. Füllt Bestellformular aus
3. Klickt "Bestellung aufgeben"
4. Wird zu Stripe Checkout weitergeleitet
5. Zahlung wird verarbeitet
6. Bestätigung per E-Mail
7. Bestellstatus wird aktualisiert

## 🔧 Konfiguration

### Environment-Variablen
Kopiere `backend/env.example` zu `backend/.env`:

```bash
# Stripe (für Production)
STRIPE_SECRET_KEY=sk_live_your_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# E-Mail (optional)
SMTP_HOST=smtp.gmail.com
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### Development-Modus
Ohne Stripe-Keys funktioniert das System im Simulation-Modus:
- Simulierte Zahlungssessions
- Simulierte Webhooks
- E-Mails werden übersprungen

## 📊 API Endpoints

### Stripe
- `POST /api/stripe/create-checkout-session` - Erstellt Zahlungssession
- `POST /api/stripe/webhook` - Verarbeitet Stripe-Webhooks
- `GET /api/stripe/session/:sessionId` - Prüft Session-Status

### Bestellungen
- `GET /api/orders` - Alle Bestellungen (Admin)
- `GET /api/orders/:id` - Bestellung nach ID
- `POST /api/orders` - Neue Bestellung erstellen

### Gesundheit
- `GET /health` - System-Status

## 🛡️ Sicherheit

- ✅ Webhook-Signatur-Verifikation
- ✅ Rate Limiting (100 Requests/15min)
- ✅ Input-Validierung
- ✅ SQL-Injection-Schutz
- ✅ CORS-Konfiguration
- ✅ Helmet.js Security-Headers

## 📧 E-Mail-System

### Automatische E-Mails
- ✅ Bestellbestätigung (HTML-Template)
- ✅ Zahlungsfehler-Benachrichtigung
- ✅ Professionelle Templates

### Konfiguration
```bash
# Gmail Beispiel
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

## 🗃️ Datenbank

### SQLite-Schema
```sql
-- Bestellungen
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending',
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  -- ... weitere Felder
);

-- Produkte
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  -- ... weitere Felder
);
```

## 🔍 Monitoring

### Health Check
```bash
curl http://localhost:3000/health
```

### Logs
- Strukturierte Logs mit Winston
- Error-Tracking
- Payment-Logging

## 🚀 Deployment

### Voraussetzungen
- Node.js 18+
- SSL-Zertifikat (für Production)
- Stripe-Account
- SMTP-Server (optional)

### Deployment-Schritte
1. Environment-Variablen konfigurieren
2. Stripe-Webhook-Endpoint einrichten
3. SSL-Zertifikat installieren
4. Domain konfigurieren

### Empfohlene Plattformen
- **Render**: Einfaches Deployment
- **Railway**: Automatische SSL
- **Vercel**: Frontend-Hosting
- **Heroku**: Full-Stack

## 🐛 Troubleshooting

### Häufige Probleme
1. **Stripe-Keys fehlen**: System läuft im Simulation-Modus
2. **E-Mails werden nicht versendet**: SMTP nicht konfiguriert
3. **CORS-Fehler**: FRONTEND_URL in .env prüfen

### Debugging
```bash
# Logs prüfen
tail -f backend/logs/app.log

# Health Check
curl http://localhost:3000/health

# Stripe Webhooks testen
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## 📚 Dokumentation

- [Implementierungsdokumentation](IMPLEMENTATION_DOKUMENTATION.md)
- [API-Dokumentation](backend/README.md)
- [Stripe-Dokumentation](https://stripe.com/docs)

## 🤝 Contributing

1. Fork erstellen
2. Feature-Branch erstellen
3. Änderungen committen
4. Pull Request erstellen

## 📄 Lizenz

MIT License - siehe [LICENSE](LICENSE) Datei.

---

**Entwickelt für SunSano Saftbar**  
**Version:** 1.0.0  
**Letzte Aktualisierung:** $(date)


