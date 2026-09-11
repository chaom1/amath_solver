export const TILE_DEFINITIONS = Object.freeze({
  "0": { label: "0", score: 1, kind: "digit" },
  "1": { label: "1", score: 1, kind: "digit" },
  "2": { label: "2", score: 1, kind: "digit" },
  "3": { label: "3", score: 1, kind: "digit" },
  "4": { label: "4", score: 2, kind: "digit" },
  "5": { label: "5", score: 1, kind: "digit" },
  "6": { label: "6", score: 2, kind: "digit" },
  "7": { label: "7", score: 2, kind: "digit" },
  "8": { label: "8", score: 2, kind: "digit" },
  "9": { label: "9", score: 2, kind: "digit" },
  "10": { label: "10", score: 3, kind: "number" },
  "11": { label: "11", score: 4, kind: "number" },
  "12": { label: "12", score: 3, kind: "number" },
  "13": { label: "13", score: 6, kind: "number" },
  "14": { label: "14", score: 4, kind: "number" },
  "15": { label: "15", score: 4, kind: "number" },
  "16": { label: "16", score: 4, kind: "number" },
  "17": { label: "17", score: 6, kind: "number" },
  "18": { label: "18", score: 4, kind: "number" },
  "19": { label: "19", score: 7, kind: "number" },
  "20": { label: "20", score: 5, kind: "number" },
  "+": { label: "+", score: 2, kind: "operator" },
  "-": { label: "−", score: 2, kind: "operator" },
  "*": { label: "×", score: 2, kind: "operator" },
  "/": { label: "÷", score: 1, kind: "operator" },
  "+-": { label: "+/−", score: 2, kind: "flex-add" },
  "*/": { label: "×/÷", score: 1, kind: "flex-multiply" },
  "=": { label: "=", score: 1, kind: "equals" },
  "?": { label: "?", score: 0, kind: "blank" }
});

export const TILE_ORDER = Object.freeze([
  ...Array.from({ length: 21 }, (_, index) => String(index)),
  "+", "-", "*", "/", "+-", "*/", "=", "?"
]);

export const FACE_LABELS = Object.freeze({ "*": "×", "/": "÷", "-": "−" });

export function faceLabel(face) {
  return FACE_LABELS[face] ?? String(face);
}

export function createTile(type, face = null, source = "hand") {
  const definition = TILE_DEFINITIONS[type];
  if (!definition) throw new Error(`Unknown tile type: ${type}`);
  return {
    type,
    face: face ?? defaultFace(type),
    score: definition.score,
    kind: definition.kind,
    source
  };
}

export function defaultFace(type) {
  if (type === "+-" || type === "*/" || type === "?") return null;
  return type;
}

export function assignmentsFor(tile) {
  if (tile.face !== null && tile.face !== undefined) return [tile];
  if (tile.type === "+-") return ["+", "-"] .map((face) => ({ ...tile, face }));
  if (tile.type === "*/") return ["*", "/"].map((face) => ({ ...tile, face }));
  if (tile.type === "?") {
    return [...Array.from({ length: 21 }, (_, index) => String(index)), "+", "-", "*", "/", "="]
      .map((face) => ({ ...tile, face }));
  }
  return [{ ...tile, face: tile.type }];
}

export function tileRole(tile) {
  const numeric = /^\d+$/.test(String(tile.face));
  if (!numeric) return tile.face === "=" ? "equals" : "operator";
  const value = Number(tile.face);
  if ((tile.kind === "digit") || (tile.kind === "blank" && value <= 9)) return "digit";
  return "number";
}
