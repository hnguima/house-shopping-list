# Copilot Instructions for FinTrack

## Project Overview

- **FinTrack** is a cross-platform finance tracking assistant with a React/TypeScript/Vite frontend (in `app/`), and a Python backend (`server/`).
- The main app (`app/`) uses Material-UI, Capacitor (for mobile features), and Vite. It targets both web and Android (see `android/` and Capacitor configs).
- The backend (`server/`) is a Flask-based API with OAuth, database, and session management.

## Key Architectural Patterns

- **Screen Routing:** Main navigation and layout are managed in `app/src/App.tsx` using a `Container` and a fixed `Header` component. All screens (e.g., `DashboardScreen`, `UserProfileScreen`, `ConfigScreen`) are rendered via a central `renderScreen()` function.
- **Safe Area Handling:** Mobile safe area insets are handled in `App.tsx` by dynamically setting `paddingTop` on the main `Container` using Capacitor and StatusBar APIs. Avoid setting extra margin/padding in individual screens for header spacing.
- **Component Structure:** Each screen (e.g., `UserProfileScreen.tsx`) is a functional React component, often using Material-UI's `Box`, `Paper`, and custom styled components. Shared UI patterns are in `app/src/components/`.
- **Photo Uploads:** User profile photo capture and upload use Capacitor Camera plugin for native, and file input for web. See `UserProfileScreen.tsx` for the menu-driven approach.
- **Persistent Config:** Theme and language preferences are managed via `usePersistentConfig` and synced with user profile and localStorage.

## Developer Workflows

- **Frontend (Vite app):**
  - Install: `cd app && npm install`
  - Dev: `npm run dev` (Vite, hot reload)
  - Android: Use Capacitor (`npx cap open android`), build with `npm run build` then `npx cap sync android`
- **Backend (Flask):**
  - Install: `cd server && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt`
  - Run: `python database.py` (for DB setup), `python user_api.py` (API server)
  - OAuth: See `server/google_oauth_setup.md`
- **Testing:**
  - Frontend: `npm test` (Jest/React Testing Library)
  - Backend: `pytest` or run test scripts in `server/`

## Project-Specific Conventions

- **No extra top margin/padding in screens:** All header/safe area spacing is handled in `App.tsx`'s main `Container`.
- **Material-UI:** Use `sx` prop for styling, prefer `Box`/`Paper` for layout, and `styled()` for custom components.
- **Capacitor Plugins:** Use `Capacitor.isNativePlatform()` to branch between native and web logic.
- **API Calls:** Use `ApiClient` utility for all backend communication.
- **Language Support:** i18n is set up in `app/src/i18n.ts`. Only call `i18n.changeLanguage` with supported languages.

## Integration Points

- **Mobile:** Android build and device features via Capacitor. See `app/android-setup.md` and `app/android/`.
- **Backend:** All data and auth via Flask API in `server/`.
- **Assets:** Place images and static files in `app/src/assets/` or `public/`.
- **Locales:** Language files are in `app/src/locales/`. Use `i18n` for translations.

## Key Files & Directories

- `app/src/App.tsx` — Main app shell, routing, safe area logic
- `app/src/screens/` — All main screens/components
- `app/src/components/` — Shared UI components
- `app/src/utils/apiClient.ts` — API abstraction
- `server/` — Flask backend, OAuth, DB
- `app/android-setup.md` — Android/Capacitor setup guide

---

For any unclear patterns or missing conventions, ask for clarification or check the latest code in the relevant directory.
