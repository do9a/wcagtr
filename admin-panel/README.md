# Admin Panel - Development Guide

## Overview

The Admin Panel is a **vanilla JavaScript SPA** (single-page application) for platform administrators to monitor the WCAGTR system, manage customers, oversee scans, and manage widget tokens.

## Architecture

- **Framework**: None (vanilla JS ES2020+ modules)
- **Routing**: Hash-based (`#/dashboard`, `#/customers`, etc.)
- **Authentication**: JWT (admin-type tokens)
- **Styling**: CSS custom properties, mobile-first responsive
- **Accessibility**: WCAG 2.2 compliant (all 31 TR checklist criteria)

## Project Structure

```
admin-panel/
├── src/
│   ├── index.html          # SPA shell (semantic HTML)
│   ├── app.js              # Router & state manager
│   ├── auth.js             # Admin authentication
│   ├── api.js              # API client wrapper
│   ├── components/
│   │   ├── dashboard.js    # Dashboard view (metrics)
│   │   ├── customers.js    # Customer management
│   │   ├── scans.js        # Scan monitoring
│   │   ├── tokens.js       # Token oversight
│   │   ├── health.js       # System health
│   │   ├── navbar.js       # Navigation (static in HTML)
│   │   ├── modal.js        # Reusable modal component
│   │   └── table.js        # Sortable data table
│   ├── styles/
│   │   ├── main.css        # Base styles + CSS variables
│   │   ├── components.css  # Component-specific styles
│   │   └── responsive.css  # Media queries (mobile-first)
│   └── i18n/
│       ├── tr.js           # Turkish translations
│       └── en.js           # English translations
└── README.md               # This file
```

## Setup & Development

### Prerequisites

- Node.js 20+ (for backend)
- PostgreSQL 16+ (running)
- Backend API running on `http://localhost:3000`

### Start Admin Panel

```bash
# 1. Start backend (from project root)
cd backend
node src/index.js

# 2. Serve admin panel (from admin-panel/src)
cd admin-panel/src
python3 -m http.server 8081

# 3. Open in browser
open http://localhost:8081
```

### Default Admin Credentials

```
Email: admin@wcagtr.com
Password: admin123
```

## Features

### ✅ Implemented

- **Authentication**: Login with JWT, auto-logout on expiry
- **Dashboard**: Total customers, scans, active tokens, recent activity
- **Customers**: List all customers with search, pagination
- **Scans**: Monitor all scans with filters (date, customer, status)
- **Tokens**: View all widget tokens, revoke capability
- **Health**: System health metrics (backend, database, uptime)
- **Routing**: Hash-based SPA routing with browser back/forward support
- **Responsive**: Mobile-first design (320px → 1440px+)
- **Accessibility**: WCAG 2.2 compliant (keyboard nav, screen reader support)
- **i18n**: Turkish + English support (language switcher)

### 🔄 In Progress

- **Modal actions**: Customer view/edit/delete modals
- **Advanced filters**: Date range pickers, multi-select filters
- **Charts**: Visual analytics (scan trends, violation types)
- **Real-time updates**: WebSocket or polling for live metrics

### 📋 Planned

- **Billing management**: Subscription plans, invoices
- **Webhooks**: Configure customer notifications
- **Audit logs**: Admin action history
- **2FA**: Two-factor authentication for admin
- **Export**: CSV/Excel export for reports

## API Endpoints (Backend)

All admin endpoints require `Authorization: Bearer <admin-jwt>` header.

### Dashboard
- `GET /api/v1/admin/dashboard` - Summary stats

### Customers
- `GET /api/v1/admin/customers?page=1&limit=50&search=` - List customers
- `GET /api/v1/admin/customers/:id` - Get customer details
- `PATCH /api/v1/admin/customers/:id/suspend` - Suspend customer
- `DELETE /api/v1/admin/customers/:id` - Delete customer

### Scans
- `GET /api/v1/admin/scans?page=1&limit=50&customerId=&startDate=&endDate=` - List scans
- `GET /api/v1/admin/scans/:id` - Get scan details

### Tokens
- `GET /api/v1/admin/tokens?page=1&limit=50&customerId=&isActive=` - List tokens
- `PATCH /api/v1/admin/tokens/:id/revoke` - Revoke token

### Metrics
- `GET /api/v1/admin/metrics` - System metrics
- `GET /api/v1/health` - Health check

## Code Style

### JavaScript

- ES2020+ modules (`import`/`export`)
- Async/await for all API calls
- No JSX, no virtual DOM
- Comments for complex logic only

```javascript
// Good: Async/await with error handling
export async function render() {
  const result = await getCustomers();
  if (!result.success) {
    return showError(result.error);
  }
  return renderCustomerList(result.data);
}
```

### CSS

- Mobile-first (320px base, progressive enhancement)
- CSS custom properties for theming
- BEM-style naming (`.stat-card`, `.stat-card__title`)
- No preprocessors (vanilla CSS only)

```css
/* Good: Mobile-first with CSS variables */
.stat-card {
  padding: var(--space-4);
  background: var(--color-bg);
}

@media (min-width: 768px) {
  .stat-card {
    padding: var(--space-6);
  }
}
```

### HTML

- Semantic elements (`<nav>`, `<main>`, `<section>`, not `<div>` soup)
- ARIA only when native HTML insufficient
- All interactive elements keyboard accessible

```html
<!-- Good: Semantic + accessible -->
<nav role="navigation" aria-label="Ana navigasyon">
  <a href="#/dashboard" aria-current="page">Genel Bakış</a>
</nav>
```

## WCAG 2.2 Compliance

Every component meets these requirements:

✅ **Keyboard Navigation**: Tab, Enter, Escape, Arrow keys  
✅ **Focus Indicators**: 2px solid outline, visible on all interactive elements  
✅ **Color Contrast**: ≥4.5:1 for text, ≥3:1 for UI components  
✅ **Screen Readers**: ARIA labels, live regions, semantic HTML  
✅ **Touch Targets**: ≥44×44px (WCAG 2.5.5)  
✅ **Motion**: Respects `prefers-reduced-motion`  
✅ **Language**: `lang` attribute on dynamic content  
✅ **Skip Links**: "Skip to main content" visible on focus  

## Testing

### Manual Testing

```bash
# Run integration tests
./test-admin-panel.sh
```

### Browser Testing

- ✅ Safari (macOS default)
- ✅ Chrome (latest)
- ⚠️ Firefox (basic testing)
- ⚠️ Mobile Safari (iPad/iPhone)

### Accessibility Testing

- **Keyboard**: Tab through entire app, no mouse
- **VoiceOver**: Enable on macOS (`Cmd+F5`), navigate with `VO+arrows`
- **Contrast**: Use Chrome DevTools Lighthouse audit
- **Responsive**: Chrome DevTools device emulation

## Troubleshooting

### Backend Connection Error

```
Error: Sunucuya bağlanılamadı
```

**Solution**: Ensure backend is running on `http://localhost:3000`

```bash
cd backend
node src/index.js
```

### 401 Unauthorized

**Solution**: Token expired, re-login. Check admin credentials in database:

```sql
SELECT email, password FROM admin_users WHERE email = 'admin@wcagtr.com';
```

### CORS Error

**Solution**: Check backend CORS config in `backend/src/index.js`:

```javascript
app.use(cors({
  origin: '*', // Allow all origins in dev
}));
```

## Performance

- **Initial Load**: ~50ms (no bundler, direct ES modules)
- **Route Change**: ~20ms (hash-based, no server request)
- **API Response**: ~100ms (local PostgreSQL)
- **Bundle Size**: N/A (no bundler, individual file loads)

## Security

- **JWT Validation**: All admin routes check `type: 'admin'`
- **HTTPS**: Required in production (dev uses HTTP)
- **CSP**: Content Security Policy headers via Helmet
- **Rate Limiting**: 100 req/15min per IP (backend)
- **XSS Protection**: No `innerHTML` with user input, parameterized SQL

## Contributing

1. Follow WCAG 2.2 guidelines (31 criteria)
2. Test with keyboard only
3. Test with VoiceOver
4. Mobile-first CSS
5. No external dependencies (vanilla JS only)

## License

Proprietary - WCAGTR Platform

---

**Last Updated**: 2026-04-08  
**Version**: 1.0.0  
**Status**: ✅ Phase 1 Complete (Foundation + Core Views)
