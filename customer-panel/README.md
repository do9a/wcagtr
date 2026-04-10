# WCAGTR Customer Panel

**"Data Sanctuary" Design System** - Modern, accessible customer dashboard for WCAGTR platform.

## 🎨 Design Concept

**Aesthetic Direction:** Refined minimalism with technical sophistication
- **Color Palette:** Deep navy base + electric cyan accents + warm amber highlights
- **Typography:** Plus Jakarta Sans (UI) + JetBrains Mono (data/code)
- **Philosophy:** Clean, confident, data-focused interface with hexagonal accents

## 🚀 Features

### ✅ Implemented Pages

1. **Dashboard** (`#/`)
   - Overview statistics (total scans, active tokens, violations, avg score)
   - Recent scans table
   - Real-time data from backend API

2. **Scans** (`#/scans`)
   - Complete scan history
   - Pagination support
   - WCAG compliance scoring
   - Violation counts and status badges

3. **Tokens** (`#/tokens`)
   - Widget token management
   - Create new tokens for domains
   - Token activation/deactivation
   - Copy token to clipboard

4. **Domains** (`#/domains`)
   - Domain overview with stats
   - Widget integration status
   - Auto-fix configuration
   - Detailed integration guide with code snippets
   - Domain detail modal with copy-to-clipboard

### 🔐 Authentication

- Customer login with email/password
- JWT token storage in localStorage
- Automatic session validation
- Token expiration handling
- Logout functionality

### 🎯 Key Components

- **Router:** Hash-based SPA routing (no page reloads)
- **API Client:** Centralized fetch wrapper with JWT injection
- **Toast Notifications:** Success/error messaging system
- **Modal Dialogs:** Accessible, keyboard-navigable modals
- **Data Tables:** Responsive tables with pagination
- **Loading States:** Visual feedback for async operations

## 📁 Project Structure

```
customer-panel/
├── src/
│   ├── index.html              # Main HTML (login + dashboard views)
│   ├── app.js                  # Application entry point
│   ├── auth.js                 # Authentication logic
│   ├── api.js                  # API client with JWT
│   ├── router.js               # Hash-based SPA router
│   │
│   ├── components/
│   │   ├── dashboard.js        # Dashboard page
│   │   ├── scans.js            # Scans list page
│   │   ├── tokens.js           # Token management page
│   │   └── domains.js          # Domain management + integration guide
│   │
│   └── styles/
│       ├── base.css            # Variables, reset, typography
│       ├── components.css      # Login, sidebar, buttons, forms
│       └── views.css           # Page layouts, tables, modals
│
└── README.md                   # This file
```

## 🛠️ Tech Stack

- **Zero Frameworks:** Pure vanilla JavaScript (ES6 modules)
- **CSS:** Custom properties (CSS variables) for theming
- **HTML:** Semantic, accessible markup
- **WCAG 2.2 AA:** Full keyboard navigation, ARIA labels, focus management

## 🎨 Design System

### Color Palette

```css
/* Primary */
--color-navy-950: #0a0e1a;     /* Background */
--color-navy-900: #0f172a;     /* Cards */
--color-navy-800: #1e293b;     /* Elevated */

/* Accents */
--color-cyan-400: #22d3ee;     /* Primary accent */
--color-amber-400: #fbbf24;    /* Secondary accent */

/* Semantic */
--success-color: #4ade80;
--error-color: #f87171;
--warning-color: #fbbf24;
```

### Typography

```css
/* Headings & UI */
font-family: 'Plus Jakarta Sans', sans-serif;

/* Data & Code */
font-family: 'JetBrains Mono', monospace;
```

### Spacing Scale

```css
--space-xs: 0.25rem;   /* 4px */
--space-sm: 0.5rem;    /* 8px */
--space-md: 1rem;      /* 16px */
--space-lg: 1.5rem;    /* 24px */
--space-xl: 2rem;      /* 32px */
--space-2xl: 3rem;     /* 48px */
```

## 🚦 Getting Started

### 1. Prerequisites

- Backend API running at `http://localhost:3000`
- Modern browser with ES6 module support

### 2. Start Local Server

```bash
cd customer-panel
python3 -m http.server 8082
```

### 3. Open in Browser

```
http://localhost:8082/src/
```

### 4. Login

Default test credentials (create via backend):
```
Email: test@example.com
Password: password123
```

## 📡 API Integration

### Backend Endpoints Used

```javascript
// Authentication
POST /api/v1/auth/login

// Scans
GET /api/v1/scans?page=1&limit=20

// Tokens
GET /api/v1/tokens
POST /api/v1/tokens
DELETE /api/v1/tokens/:id

// Dashboard stats (derived from scans + tokens)
```

### API Client Usage

```javascript
import { get, post, del, showToast } from './api.js';

// GET request
const result = await get('/scans', { page: 1 });

// POST request
const result = await post('/tokens', { 
  domain: 'example.com',
  autoFixEnabled: true 
});

// DELETE request
const result = await del('/tokens/123');

// Show notification
showToast('Success!', 'success');
```

## ♿ Accessibility Features

### WCAG 2.2 AA Compliant

- ✅ Semantic HTML5 elements
- ✅ ARIA labels and roles
- ✅ Keyboard navigation (Tab, Enter, Esc)
- ✅ Focus visible indicators (2px outline)
- ✅ Color contrast ratios (4.5:1 text, 3:1 UI)
- ✅ Screen reader support
- ✅ Form validation with error messages
- ✅ Live regions for dynamic content
- ✅ Reduced motion support

### Keyboard Shortcuts

- **Tab:** Navigate between interactive elements
- **Enter/Space:** Activate buttons and links
- **Esc:** Close modals
- **Arrow Keys:** Navigate lists (future)

## 🎭 Animation Philosophy

- **Purposeful motion:** Animations enhance UX, not distract
- **Staggered reveals:** Dashboard cards fade in sequentially
- **Smooth transitions:** 250ms cubic-bezier for state changes
- **Respects prefers-reduced-motion:** Disables animations if user preference set

## 🔒 Security

- JWT tokens stored in localStorage
- Automatic token validation on app load
- Token expiration handling (logout on 401)
- XSS protection via HTML escaping
- No inline JavaScript in HTML

## 🚧 Future Enhancements

- [ ] Dark/Light theme toggle
- [ ] Advanced filtering on scans table
- [ ] Export scan reports (PDF, CSV)
- [ ] Real-time notifications via WebSocket
- [ ] Keyboard shortcuts panel
- [ ] Multi-language support (TR/EN)
- [ ] Violation details drill-down
- [ ] Widget preview/sandbox
- [ ] Billing & subscription management

## 📊 Performance

- **Zero dependencies:** No npm packages, pure vanilla JS
- **Small footprint:** ~30KB total JS (unminified)
- **Fast load times:** Critical CSS inline (future optimization)
- **Lazy loading:** Components loaded on route change
- **Efficient rendering:** Minimal DOM manipulation

## 🐛 Known Issues

- Token modal uses inline styles (refactor to CSS classes)
- Pagination doesn't persist on route change
- No offline support (future: Service Worker)

## 📝 Contributing

When adding new pages:

1. Create component in `components/` folder
2. Export `render[PageName]()` function
3. Add route to `router.js`
4. Add nav link in `index.html` sidebar
5. Follow design system (colors, spacing, typography)
6. Ensure WCAG 2.2 AA compliance

## 📄 License

Proprietary - WCAGTR Platform

---

**Built with ♿ accessibility in mind**  
*"Data Sanctuary" design system - Clean, confident, technical*
