(() => {
  const measurementId = "G-G59ZHX4YS9";
  if (window.location.hostname.toLowerCase() !== "labs.multiplier.co") return;

  const allowedParameters = new Set([
    "button_name",
    "destination",
    "error_type",
    "method",
    "product",
    "result",
    "surface",
    "tool_name",
  ]);

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", measurementId, { send_page_view: true });

  function track(eventName, parameters = {}) {
    const safeParameters = Object.fromEntries(
      Object.entries(parameters).filter(([key, value]) => (
        allowedParameters.has(key)
        && value !== undefined
        && value !== null
        && ["string", "number", "boolean"].includes(typeof value)
      )),
    );
    window.gtag("event", eventName, {
      send_to: measurementId,
      ...safeParameters,
    });
  }

  window.multiplierLabsAnalytics = Object.freeze({ track });

  document.addEventListener("click", (event) => {
    const source = event.target;
    if (!source || typeof source.closest !== "function") return;
    const element = source.closest("[data-analytics-event]");
    if (!element) return;

    track(element.dataset.analyticsEvent, {
      button_name: element.dataset.analyticsButton,
      destination: element.dataset.analyticsDestination,
      product: element.dataset.analyticsProduct,
      surface: element.dataset.analyticsSurface,
      tool_name: element.dataset.analyticsTool,
    });
  });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);
})();
