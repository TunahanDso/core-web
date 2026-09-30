import { defineCustomElements } from "https://cdn.jsdelivr.net/npm/@cloudflare/realtimekit-ui@2.0.2/loader/index.es2017.js";

defineCustomElements();
window.__CORE_RTK_UI_READY__=true;
window.dispatchEvent(new Event("core:realtimekit-ui-ready"));
