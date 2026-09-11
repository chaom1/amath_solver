import { solveLine } from "./solver.js";

self.addEventListener("message", (event) => {
  try {
    self.postMessage({ ok: true, payload: solveLine(event.data) });
  } catch (error) {
    self.postMessage({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});
