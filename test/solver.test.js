import test from "node:test";
import assert from "node:assert/strict";
import { analyzeEquation, solveLine } from "../src/solver.js";
import { createTile, TILE_DEFINITIONS } from "../src/tiles.js";

function tokens(specification) {
  return specification.map((entry) => {
    if (typeof entry === "string") return createTile(entry, null, "hand");
    return createTile(entry.type, entry.face, entry.source ?? "hand");
  });
}

test("accepts basic and chained equalities", () => {
  assert.equal(analyzeEquation(tokens(["1", "+", "2", "=", "3"]), true).complete, true);
  assert.equal(analyzeEquation(tokens(["3", "=", "3", "=", "3"]), true).complete, true);
});

test("uses the supplied physical tile scores", () => {
  assert.deepEqual(
    Object.fromEntries(["0", "5", "10", "13", "19", "+", "/", "+-", "*/", "=", "?"].map((type) => [type, TILE_DEFINITIONS[type].score])),
    {
      "0": 1, "5": 1, "10": 3, "13": 6, "19": 7,
      "+": 2, "/": 1, "+-": 2, "*/": 1, "=": 1, "?": 0
    }
  );
});

test("uses exact fractions and standard precedence", () => {
  assert.equal(analyzeEquation(tokens(["1", "/", "2", "+", "1", "/", "2", "=", "1"]), true).complete, true);
  assert.equal(analyzeEquation(tokens(["2", "+", "3", "*", "4", "=", "1", "4"]), true).complete, true);
});

test("enforces unary and zero rules", () => {
  assert.equal(analyzeEquation(tokens(["-", "3", "=", "1", "-", "4"]), true).complete, true);
  assert.equal(analyzeEquation(tokens(["-", "0", "=", "0"]), true).valid, false);
  assert.equal(analyzeEquation(tokens(["+", "3", "=", "3"]), true).valid, false);
  assert.equal(analyzeEquation(tokens(["6", "+", "-", "3", "=", "3"]), true).valid, false);
  assert.equal(analyzeEquation(tokens(["1", "/", "0", "=", "1"]), true).valid, false);
});

test("only single-digit physical tiles concatenate", () => {
  assert.equal(analyzeEquation(tokens(["1", "2", "=", "12"]), true).complete, true);
  assert.equal(analyzeEquation(tokens(["12", "3", "=", "1", "2", "3"]), true).valid, false);
  assert.equal(analyzeEquation(tokens(["0", "1", "=", "1"]), true).valid, false);
  assert.equal(analyzeEquation(tokens(["1", "2", "3", "4", "=", "1"]), true).valid, false);
});

test("blank and flexible tiles retain their physical score", () => {
  const equation = tokens([
    { type: "?", face: "3" },
    { type: "+-", face: "+" },
    "2", "=", "5"
  ]);
  assert.equal(analyzeEquation(equation, true).complete, true);
  assert.equal(equation[0].score, 0);
  assert.equal(equation[1].score, 2);
});

test("solver includes a locked tile and places at least one hand tile", () => {
  const board = [null, createTile("3", null, "board"), null, null, null];
  const hand = [createTile("=", null, "hand"), createTile("3", null, "hand")];
  const output = solveLine({ board, hand, timeLimitMs: 1000 });
  assert.equal(output.complete, true);
  assert.ok(output.results.some((result) => result.equation === "3=3"));
  const match = output.results.find((result) => result.equation === "3=3");
  assert.equal(match.score, 3);
  assert.equal(match.usedCount, 2);
});

test("solver supports a first move with no locked board tiles", () => {
  const board = Array(5).fill(null);
  const hand = tokens(["1", "=", "1"]);
  const output = solveLine({ board, hand, timeLimitMs: 1000 });
  assert.equal(output.complete, true);
  assert.ok(output.results.some((result) => result.equation === "1=1"));
  assert.ok(output.results.every((result) => result.usedCount >= 1));
});

test("adds 40 points for eight hand tiles", () => {
  const board = [createTile("1", null, "board"), null, null, null, null, null, null, null, null];
  const hand = tokens(["+", "1", "+", "1", "=", "1", "+", "2"]);
  const output = solveLine({ board, hand, bingoOnly: true, timeLimitMs: 1000 });
  const match = output.results.find((result) => result.equation === "1+1+1=1+2");
  assert.ok(match);
  assert.equal(match.usedCount, 8);
  assert.equal(match.bingoBonus, 40);
});

test("finds the same top bingo on the reported 15-cell position", () => {
  const board = Array(15).fill(null);
  ["7", "=", "19", "-", "12"].forEach((type, index) => {
    board[index + 5] = createTile(type, null, "board");
  });
  const hand = tokens(["+-", "14", "3", "5", "5", "9", "?", "?"]);

  const output = solveLine({ board, hand, maxNodes: 5_000_000 });
  const match = output.results.find((result) => result.equation === "3−57=19−12×14+95");

  assert.equal(output.complete, true);
  assert.ok(match);
  assert.equal(match.usedCount, 8);
  assert.equal(match.baseScore, 26);
  assert.equal(match.bingoBonus, 40);
  assert.equal(match.score, 66);
});
