SunSano – Saftbar Website

Projektstruktur
- `index.html`: Startseite mit semantischem, zugänglichem HTML
- `assets/css/style.css`: Designsystem, Layout, Komponenten (Buttons, Cards, Formulare, Modals)
- `assets/js/main.js`: Navigation, Smooth-Scroll, Bewertungssystem, Warenkorb-Funktionalität
- `assets/images/`: Platzhalter-Grafiken (bitte eigene PNG/JPGs ersetzen)
- `assets/pdf/speisekarte.pdf`: Speisekarte als PDF (Platzhalter)

Features
- **Bewertungssystem**: 5-Sterne-Ratings mit Filter- und Sortierfunktionen
- **Bewertungen erstellen**: Interaktives Formular für neue Kundenbewertungen
- **Warenkorb**: Vollständige Einkaufsfunktion mit localStorage-Persistierung
- **Checkout-System**: 4-Schritt Bestellprozess mit Payment-Status-Management
- **Payment-State-Machine**: Robuste Statusverwaltung (pending → processing → paid/failed)
- **Webhook-Simulation**: Realistische Payment-Provider-Integration mit Retry-Logic
- **Payment-Polling**: Fallback-Mechanismus für Webhook-Failures
- **Comprehensive Logging**: Vollständige Audit-Trail für Payment-Events
- **Responsive Design**: Mobile-first Ansatz mit Touch-optimierten Interaktionen
- **Modals**: Bewertungen, Warenkorb und Checkout als Overlay-Dialoge

Designsystem
- Farben: Primär-Grün `#2e7d32`, Akzent-Orange `#f57c00`, neutrale Flächen/Borders
- Typografie: System-UI-Stack für Performance & macOS-Look
- Komponenten: `.btn`, `.card`, `.form`, `.modal`, `.review-card`, `.cart-item`

Entwicklung
1. Öffne `index.html` im Browser
2. Ersetze Platzhalterbilder in `assets/images/` (z. B. `hero.jpg`, `product-*.jpg`)
3. Ersetze `assets/pdf/speisekarte.pdf`
4. Passe Bewertungen in `assets/js/main.js` an (reviews-Array)
5. Passe Produkte/Preise in `assets/js/main.js` an (products-Array)

Debug & Testing
- Payment-Logs anzeigen: `viewPaymentLogs()` in Browser-Konsole
- Payment-Status simulieren: Verschiedene Szenarien in `assets/js/checkout.js`
- Webhook-Failure-Rate: 30% (simuliert realistische Webhook-Probleme)
- Payment-Polling: 30-Sekunden-Intervalle für 10 Minuten

Barrierefreiheit
- Skip-Link, semantische Regionen (`header`, `main`, `footer`, `section`)
- Focus-Styles, ARIA-Attribute für mobile Navigation und Modals
- Alt-Texte für Bilder, Screen Reader optimiert

Deployment-Tipp
- Statisches Hosting (z. B. GitHub Pages, Netlify, Vercel). Achte auf korrekte relative Pfade (`assets/...`).


