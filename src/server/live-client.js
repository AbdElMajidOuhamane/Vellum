// @flow

/**
 * Served as a classic script in development. It polls a tiny JSON endpoint;
 * Fairyfly buffers responses, so SSE/WebSocket streaming would add complexity
 * without improving reliability.
 */
export const LIVE_CLIENT /*: string */ = `(function () {
  "use strict";
  var dev = window.__VELLUM_DEV__ || {};
  var base = dev.base || "/";
  var endpoint = base.replace(/\\/$/, "") + "/__vellum/version";
  var version = dev.version || null;
  var badge = document.createElement("div");
  badge.setAttribute("data-vellum-dev", "");
  badge.style.cssText = "position:fixed;right:12px;bottom:12px;z-index:9999;display:flex;align-items:center;gap:6px;padding:5px 9px;border:1px solid rgba(127,127,127,.35);border-radius:999px;background:rgba(12,14,20,.82);color:#d8dbe6;font:11px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace;box-shadow:0 4px 16px rgba(0,0,0,.25);backdrop-filter:blur(6px);opacity:.85";
  var dot = document.createElement("span");
  dot.style.cssText = "width:6px;height:6px;border-radius:50%;background:#3ddc84;box-shadow:0 0 8px #3ddc84";
  badge.appendChild(dot);
  badge.appendChild(document.createTextNode("vellum dev"));
  document.body.appendChild(badge);

  function tick() {
    fetch(endpoint, { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) throw new Error("status " + response.status);
        return response.json();
      })
      .then(function (data) {
        dot.style.background = "#3ddc84";
        dot.style.boxShadow = "0 0 8px #3ddc84";
        if (version === null) {
          version = data.version;
        } else if (data.version !== version) {
          window.location.reload();
          return;
        }
        window.setTimeout(tick, 900);
      })
      .catch(function () {
        dot.style.background = "#e5484d";
        dot.style.boxShadow = "0 0 8px #e5484d";
        window.setTimeout(tick, 1800);
      });
  }
  window.setTimeout(tick, 250);
})();`;
