const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function loadGtagScript(): void {
  if (!GA_MEASUREMENT_ID) return;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID);
}

export function initAnalytics(): void {
  if (!GA_MEASUREMENT_ID) return;
  if (!import.meta.env.PROD) return;

  loadGtagScript();
}

export function trackPageView(path: string, title?: string): void {
  if (typeof window.gtag !== "function" || !GA_MEASUREMENT_ID) return;

  window.gtag("event", "page_view", {
    page_path: path,
    page_title: title ?? document.title,
  });
}
