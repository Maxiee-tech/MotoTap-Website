const SITE_ORIGIN = "https://mototap.co.ke";

export function currentPath() {
  const path = window.location.pathname.replace(/\/+$/, "");
  return path || "/";
}

export function parseRoute(pathname = currentPath(), search = window.location.search) {
  const path = (pathname.replace(/\/+$/, "") || "/");
  const params = new URLSearchParams(search);
  const parts = path.split("/").filter(Boolean);

  if (path === "/") {
    return { name: "home", params: Object.fromEntries(params.entries()) };
  }
  if (path === "/about") return { name: "about" };
  if (path === "/contacts") return { name: "contacts" };
  if (path === "/login") return { name: "login" };
  if (path === "/signup") return { name: "signup" };
  if (parts[0] === "services" && parts[1]) {
    return { name: "service", slug: parts[1], params: Object.fromEntries(params.entries()) };
  }
  if (parts[0] === "mechanics" && parts[1]) {
    return {
      name: "town",
      town: parts[1],
      service: params.get("service") || "",
      params: Object.fromEntries(params.entries()),
    };
  }
  if (parts[0] === "listing" && parts[1]) {
    return { name: "listing", slug: parts[1] };
  }
  return { name: "home", params: Object.fromEntries(params.entries()) };
}

export function setPageSeo({ title, description, canonicalPath }) {
  const fullTitle = title.includes("MotoTap") ? title : `${title} | MotoTap Autosystems`;
  document.title = fullTitle;
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute("content", description);
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute("content", fullTitle);
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute("content", description);
  const path = canonicalPath || currentPath();
  const url = `${SITE_ORIGIN}${path === "/" ? "/" : path}`;
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.setAttribute("href", url);
  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) ogUrl.setAttribute("content", url);
}

export function siteNavigate(path, { replace = false } = {}) {
  const next = path.startsWith("/") ? path : `/${path}`;
  const current = `${currentPath()}${window.location.search}`;
  if (current === next) return;
  if (replace) {
    window.history.replaceState({ mototap: true }, "", next);
  } else {
    window.history.pushState({ mototap: true }, "", next);
  }
  window.dispatchEvent(new PopStateEvent("popstate"));
}
