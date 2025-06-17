# gfarm-http-gateway webui

---

## Getting Started

### Prerequisites

* Node.js (v18 or higher recommended)

### Install dependencies

```bash
npm install
```

### Development

Start the app with hot reload:

```bash
npm run start
```

### Build for Production

```bash
npm run build
```

### Lint

```bash
npm run lint      # Check code
npm run lint:fix  # Auto-fix issues
```

### End-to-End Tests (Playwright)

Run all tests:

```bash
npm run e2e:all
```

Run in Chromium only:

```bash
npm run e2e:chromium
```

Interactive test UI:

```bash
npm run e2e:ui
```

---

## Folder Structure

```
src/
├── components/       # Reusable UI components
├── pages/            # Page-level views (Home, Login, etc.)
├── hooks/            # Custom React hooks
├── utils/            # Utility functions (e.g., API helpers)
├── App.jsx           # Main app entry
public/
└── assets/           # Static files (e.g., icons)
```
