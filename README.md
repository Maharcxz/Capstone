# Trinity Optinum Vision Center – Capstone

Project structure overview with color‑coded icons and clear grouping.

**HTML Pages**
- 📁 `root/`
- 🟧 `about.html`
- 🟧 `admin-dashboard.html`
- 🟧 `contact.html`
- 🟧 `index.html`

**CSS Styles**
- 📁 `CSS Styles/`
- Global & Layout
  - 🟦 `BaseStyles.css`
  - 🟦 `HeaderStyles.css`
  - 🟦 `SidebarStyles.css`
  - 🟦 `ResponsiveNotifStyles.css`
- Page-Specific Styles
  - 🟦 `AboutUsPageStyles.css`
  - 🟦 `AdminDashboardStyles.css`
  - 🟦 `AdminPageStyles.css`
  - 🟦 `ContactUsPageStyles.css`
  - 🟦 `ConfirmationStyles.css`
  - 🟦 `Pre-OrderStyles.css`
- Product & Frame Management
  - 🟦 `ProductGridStyles.css`
  - 🟦 `ProductModals.css`
  - 🟦 `FrameEditStyles.css`
  - 🟦 `FrameTypesMenuHeaderStyles.css`
- User Interface & Modals
  - 🟦 `LogInModalStyles.css`
  - 🟦 `NotificationIconPanelStyles.css`
  - 🟦 `TryOnStyles.css`
- Responsive Design
  - 🟦 `PreordersResponsive.css`

**JavaScript Functions**
- 📁 `Javascript Styles/`
- Authentication
  - 🟨 `AuthHandlers.js`
  - 🟨 `PassToggleFunc.js`
- Database Functions
  - 🟨 `FirebaseConfig.js`
  - 🟨 `FirebaseServices.js`
- Admin Panel
  - 🟨 `admin-dashboard.js`
  - 🟨 `SidebarFunc.js`
  - 🟨 `NotificationFunc.js`
- Product & Frame Management
  - 🟨 `ProductLoader.js`
  - 🟨 `ContentEditingFunc.js`
  - 🟨 `FrameCategoryFunc.js`
  - 🟨 `FrameEditingModal.js`
- UI Interactions & Core
  - 🟨 `EventListenerFunc.js`
  - 🟨 `Script.js`
  - 🟨 `SeachFunc.js`

**Configuration & Environment**
- 🟩 `.env`
- 🟩 `.env.example`
- 🟩 `netlify.toml`
- 🟩 `package-lock.json`

**Project Directories**
- 📁 `dist/` — compiled and optimized build files
  - 📁 `CSS Styles/` — production CSS copies
  - 📁 `Javascript Styles/` — production JS copies
  - 📁 `assets/` — compiled CSS bundles (e.g., `main-*.css`)
  - 🟧 `about.html`, 🟧 `admin-dashboard.html`, 🟧 `contact.html`, 🟧 `index.html`, plus other built pages
- 📁 `mockups/` — UI and design drafts
- 📁 `netlify/` — deployment configuration
  - 📁 `functions/`
    - 🟨 `product-suggestions.js`
    - 🟨 `send-email.js`
- 📁 `node_modules/` — project dependencies
- 📁 `scripts/`
  - 🟨 `postbuild.js`

Notes
- Some names differ from common phrasing: `ResponsiveNotifStyles.css` (global notifications), `LogInModalStyles.css` (modal styles), `SeachFunc.js` (site search).
