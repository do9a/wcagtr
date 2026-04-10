/**
 * WCAGTR Customer Panel - Router
 * Hash-based SPA routing
 */

import { renderDashboard } from "./components/dashboard.js";
import { renderScans } from "./components/scans.js";
import { renderTokens } from "./components/tokens.js";
import { renderDomains } from "./components/domains.js";
import { renderBilling } from "./components/billing.js";
import { renderWebhooks } from "./components/webhooks.js";
import { renderScanDetail } from "./components/scan-detail.js";

class Router {
  constructor(routes) {
    this.routes = routes;
    this.currentRoute = null;

    window.addEventListener("hashchange", () => this.handleRoute());
    window.addEventListener("load", () => this.handleRoute());
  }

  handleRoute() {
    const hash = window.location.hash.slice(1) || "/";
    const { route, params } = this.resolveRoute(hash);

    if (this.currentRoute?.onLeave) {
      this.currentRoute.onLeave();
    }

    this.currentRoute = route;

    if (route.onEnter) {
      route.onEnter();
    }

    document.title = route.title
      ? `${route.title} - WCAGTR`
      : "WCAGTR Customer Panel";
    this.render(route, { params, path: hash });
    this.updateNav(hash);
  }

  resolveRoute(path) {
    if (this.routes[path]) {
      return { route: this.routes[path], params: {} };
    }

    const scanDetailMatch = path.match(/^\/scans\/(\d+)$/);
    if (scanDetailMatch && this.routes["/scans/:id"]) {
      return {
        route: this.routes["/scans/:id"],
        params: { id: Number.parseInt(scanDetailMatch[1], 10) },
      };
    }

    return { route: this.routes["404"], params: {} };
  }

  render(route, context = {}) {
    const container = document.getElementById("app-content");
    if (!container) return;

    container.replaceChildren();
    const content = route.render(context);

    if (content instanceof HTMLElement) {
      container.appendChild(content);
    } else {
      container.appendChild(sanitizeHtmlToFragment(content));
    }
  }

  updateNav(currentPath) {
    const navLinks = document.querySelectorAll(".nav-link");
    navLinks.forEach((link) => {
      const route = link.dataset.route;
      const isScanDetailRoute =
        route === "/scans" && currentPath.startsWith("/scans/");

      if (route === currentPath || isScanDetailRoute) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });
  }

  navigate(path) {
    window.location.hash = path;
  }
}

export function initRouter() {
  return new Router({
    "/": {
      title: "Dashboard",
      render: () => renderDashboard(),
    },
    "/scans": {
      title: "Taramalar",
      render: () => renderScans(),
    },
    "/scans/:id": {
      title: "Tarama Detayı",
      render: ({ params }) => renderScanDetail(params?.id),
    },
    "/tokens": {
      title: "Tokenlar",
      render: () => renderTokens(),
    },
    "/domains": {
      title: "Domainler",
      render: () => renderDomains(),
    },
    "/billing": {
      title: "Abonelik",
      render: () => renderBilling(),
    },
    "/webhooks": {
      title: "Webhooklar",
      render: () => renderWebhooks(),
    },
    404: {
      title: "Sayfa Bulunamadı",
      render: () => render404(),
    },
  });
}

function render404() {
  const container = document.createElement("div");
  container.className = "empty-state";
  container.innerHTML = `
    <h2 class="empty-title">404 - Sayfa Bulunamadı</h2>
    <p class="empty-message">Aradığınız sayfa mevcut değil.</p>
    <a href="#/" class="btn btn-primary">Ana Sayfaya Dön</a>
  `;
  return container;
}

export const router = initRouter();

function sanitizeHtmlToFragment(html) {
  const template = document.createElement("template");
  template.innerHTML = String(html || "");
  template.content
    .querySelectorAll(
      "script, iframe, object, embed, frame, frameset, link[rel='import'], meta[http-equiv='refresh']",
    )
    .forEach((node) => node.remove());

  template.content.querySelectorAll("*").forEach((element) => {
    [...element.attributes].forEach((attribute) => {
      const attrName = attribute.name.toLowerCase();
      const attrValue = attribute.value.trim().toLowerCase();
      if (attrName.startsWith("on")) {
        element.removeAttribute(attribute.name);
        return;
      }
      if (
        ["href", "src", "xlink:href", "formaction"].includes(attrName) &&
        (attrValue.startsWith("javascript:") || attrValue.startsWith("data:text/html"))
      ) {
        element.removeAttribute(attribute.name);
      }
    });
  });

  return template.content;
}
