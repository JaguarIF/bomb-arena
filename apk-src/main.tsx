import { createRoot } from "react-dom/client";
import { GameApp } from "@/components/game-app";
import "@/styles.css";

function showCrash(err: unknown) {
  const msg = err instanceof Error ? `${err.message}\n${err.stack ?? ""}` : String(err);
  const el = document.getElementById("root") ?? document.body;
  el.innerHTML = `<div style="color:#f3efe6;font-family:sans-serif;padding:24px;line-height:1.4;white-space:pre-wrap">
    <p style="font-weight:600">Bomb Arena failed to start</p>
    <p style="opacity:.7;font-size:13px">${msg.replace(/</g, "<")}</p>
  </div>`;
}

window.addEventListener("error", (e) => showCrash(e.error ?? e.message));
window.addEventListener("unhandledrejection", (e) => showCrash(e.reason));

function mount() {
  document.documentElement.dataset.shell = "apk";
  const root = document.getElementById("root");
  if (!root) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", mount, { once: true });
      return;
    }
    showCrash(new Error("missing #root"));
    return;
  }
  try {
    createRoot(root).render(<GameApp />);
  } catch (err) {
    showCrash(err);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount, { once: true });
} else {
  mount();
}
