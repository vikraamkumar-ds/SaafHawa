/* SaafHawa frontend config.

   Default behavior:
     • In production (Vercel deploy):    API calls go to same-origin /api
     • Local dev (python -m http.server): API calls auto-redirect to http://localhost:8000
     • Pure offline demo:                  set API_BASE: ""  → uses built-in fallback

   To force a specific backend URL, hard-code it:
     API_BASE: "https://your-backend.com"
*/
(function () {
  const isLocalDev =
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1" ||
    location.hostname === "0.0.0.0";

  window.SAAFHAWA_CONFIG = {
    API_BASE: isLocalDev ? "http://localhost:8000" : "/api",
  };
})();
