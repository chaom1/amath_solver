import { TILE_DEFINITIONS, assignmentsFor, createTile, faceLabel, tileRole } from "./tiles.js";

const DEFAULT_LIMIT = 30;
const DEFAULT_MAX_NODES = 2_000_000;
const DEFAULT_TIME_LIMIT = null;

export const SCORE_BONUSES = Object.freeze({
  tile2: { label: "2T", tileMultiplier: 2, equationMultiplier: 1 },
  tile3: { label: "3T", tileMultiplier: 3, equationMultiplier: 1 },
  equation2: { label: "2E", tileMultiplier: 1, equationMultiplier: 2 },
  equation3: { label: "3E", tileMultiplier: 1, equationMultiplier: 3 },
});

const PREFIX_SEGMENT_START = 0;
const PREFIX_AFTER_UNARY_MINUS = 1;
const PREFIX_AFTER_OPERATOR = 2;
const PREFIX_DIGIT_ZERO = 3;
const PREFIX_DIGIT_ONE = 4;
const PREFIX_DIGIT_TWO = 5;
const PREFIX_DIGIT_THREE = 6;
const PREFIX_NUMBER_TILE = 7;
const PREFIX_INVALID = -1;

function abs(value) { return value < 0n ? -value : value; }

function gcd(a, b) {
  a = abs(a);
  b = abs(b);
  while (b !== 0n) [a, b] = [b, a % b];
  return a || 1n;
}

function fraction(numerator, denominator = 1n) {
  if (denominator === 0n) return null;
  if (denominator < 0n) {
    numerator = -numerator;
    denominator = -denominator;
  }
  const divisor = gcd(numerator, denominator);
  return { n: numerator / divisor, d: denominator / divisor };
}

function add(a, b) { return fraction(a.n * b.d + b.n * a.d, a.d * b.d); }
function subtract(a, b) { return fraction(a.n * b.d - b.n * a.d, a.d * b.d); }
function multiply(a, b) { return fraction(a.n * b.n, a.d * b.d); }
function divide(a, b) { return b.n === 0n ? null : fraction(a.n * b.d, a.d * b.n); }
function equal(a, b) { return a.n === b.n && a.d === b.d; }

function toLexemes(tokens) {
  const lexemes = [];
  for (let index = 0; index < tokens.length;) {
    const token = tokens[index];
    const role = tileRole(token);
    if (role !== "digit" && role !== "number") {
      lexemes.push({ type: role, value: token.face });
      index += 1;
      continue;
    }

    if (role === "number") {
      const next = tokens[index + 1];
      if (next && ["digit", "number"].includes(tileRole(next))) return null;
      lexemes.push({ type: "number", value: BigInt(token.face) });
      index += 1;
      continue;
    }

    let digits = "";
    while (index < tokens.length && tileRole(tokens[index]) === "digit") {
      digits += tokens[index].face;
      index += 1;
    }
    if (digits.length > 3 || (digits.length > 1 && digits.startsWith("0"))) return null;
    if (index < tokens.length && tileRole(tokens[index]) === "number") return null;
    lexemes.push({ type: "number", value: BigInt(digits) });
  }
  return lexemes;
}

function evaluateSegment(segment) {
  let cursor = 0;
  let unaryNegative = false;
  if (segment[cursor]?.type === "operator" && segment[cursor].value === "-") {
    unaryNegative = true;
    cursor += 1;
  }
  if (segment[cursor]?.type !== "number") return null;
  if (unaryNegative && segment[cursor].value === 0n) return null;

  let current = fraction(unaryNegative ? -segment[cursor].value : segment[cursor].value);
  let total = fraction(0n);
  cursor += 1;

  while (cursor < segment.length) {
    const operator = segment[cursor];
    const number = segment[cursor + 1];
    if (operator?.type !== "operator" || number?.type !== "number") return null;
    const value = fraction(number.value);
    if (operator.value === "*") current = multiply(current, value);
    else if (operator.value === "/") current = divide(current, value);
    else if (operator.value === "+") {
      total = add(total, current);
      current = value;
    } else if (operator.value === "-") {
      total = add(total, current);
      current = fraction(-value.n, value.d);
    } else return null;
    if (!current) return null;
    cursor += 2;
  }
  return add(total, current);
}

export function analyzeEquation(tokens, complete = false) {
  const lexemes = toLexemes(tokens);
  if (!lexemes) return { valid: false, complete: false };

  const segments = [[]];
  let expectingNumber = true;
  let atSegmentStart = true;
  let unaryUsed = false;
  let equalityCount = 0;

  for (const lexeme of lexemes) {
    if (expectingNumber) {
      if (lexeme.type === "number") {
        segments.at(-1).push(lexeme);
        expectingNumber = false;
        atSegmentStart = false;
        continue;
      }
      if (lexeme.type === "operator" && lexeme.value === "-" && atSegmentStart && !unaryUsed) {
        segments.at(-1).push(lexeme);
        unaryUsed = true;
        continue;
      }
      return { valid: false, complete: false };
    }

    if (lexeme.type === "operator") {
      segments.at(-1).push(lexeme);
      expectingNumber = true;
      atSegmentStart = false;
      continue;
    }
    if (lexeme.type === "equals") {
      const value = evaluateSegment(segments.at(-1));
      if (!value) return { valid: false, complete: false };
      if (segments.length > 1) {
        const firstValue = evaluateSegment(segments[0]);
        if (!firstValue || !equal(firstValue, value)) return { valid: false, complete: false };
      }
      equalityCount += 1;
      segments.push([]);
      expectingNumber = true;
      atSegmentStart = true;
      unaryUsed = false;
      continue;
    }
    return { valid: false, complete: false };
  }

  if (!complete) return { valid: true, complete: false };
  if (expectingNumber || equalityCount < 1) return { valid: true, complete: false };
  const values = segments.map(evaluateSegment);
  if (values.some((value) => !value)) return { valid: false, complete: false };
  return { valid: values.every((value) => equal(value, values[0])), complete: values.every((value) => equal(value, values[0])), value: values[0] };
}

function tileKey(tile) {
  return `${tile.type}:${tile.face ?? ""}`;
}

function resultKey(result) {
  return `${result.start}|${result.cells.map((cell) => `${cell.source}:${tileKey(cell)}`).join("|")}`;
}

function compareText(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function resultComparator(a, b) {
  return b.score - a.score || b.usedCount - a.usedCount || a.cells.length - b.cells.length || compareText(a.equation, b.equation) || a.start - b.start;
}

function pushResult(results, seen, result, limit) {
  const key = resultKey(result);
  if (seen.has(key)) return;
  seen.add(key);
  results.push(result);
  results.sort(resultComparator);
  if (results.length > limit) {
    const removed = results.pop();
    seen.delete(resultKey(removed));
  }
}

function normalizeInputTile(tile, source) {
  if (typeof tile === "string") return createTile(tile, null, source);
  const base = createTile(tile.type, tile.face ?? null, source);
  return { ...base, ...tile, source };
}

function visibleEquation(cells) {
  return cells.map((cell) => faceLabel(cell.face)).join("");
}

// Search visits millions of prefixes. Full equation analysis uses exact BigInt
// arithmetic, but most prefixes can be rejected using grammar alone. Keeping
// this tiny state machine incremental avoids reparsing the entire prefix at
// every node; exact arithmetic is still used before a result is accepted.
function advancePrefix(state, tile) {
  const role = tileRole(tile);
  const expectingNumber = state <= PREFIX_AFTER_OPERATOR;

  if (role === "digit") {
    if (expectingNumber) return String(tile.face) === "0" ? PREFIX_DIGIT_ZERO : PREFIX_DIGIT_ONE;
    if (state === PREFIX_DIGIT_ONE) return PREFIX_DIGIT_TWO;
    if (state === PREFIX_DIGIT_TWO) return PREFIX_DIGIT_THREE;
    return PREFIX_INVALID;
  }

  if (role === "number") return expectingNumber ? PREFIX_NUMBER_TILE : PREFIX_INVALID;

  if (role === "equals") {
    return state >= PREFIX_DIGIT_ZERO ? PREFIX_SEGMENT_START : PREFIX_INVALID;
  }

  if (state === PREFIX_SEGMENT_START) {
    return tile.face === "-" ? PREFIX_AFTER_UNARY_MINUS : PREFIX_INVALID;
  }
  return state >= PREFIX_DIGIT_ZERO ? PREFIX_AFTER_OPERATOR : PREFIX_INVALID;
}

export function solveLine({ board, bonuses = [], hand, bingoOnly = false, limit = DEFAULT_LIMIT, timeLimitMs = DEFAULT_TIME_LIMIT, maxNodes = DEFAULT_MAX_NODES }) {
  const started = Date.now();
  const normalizedBoard = board.map((tile) => tile ? normalizeInputTile(tile, "board") : null);
  const normalizedHand = hand.map((tile) => normalizeInputTile(tile, "hand"));
  const grouped = new Map();
  for (const tile of normalizedHand) {
    const entry = grouped.get(tile.type) ?? { tile, count: 0 };
    entry.count += 1;
    grouped.set(tile.type, entry);
  }
  const rackTypes = [...grouped.values()].sort((a, b) => b.tile.score - a.tile.score || compareText(a.tile.type, b.tile.type));
  const counts = rackTypes.map((entry) => entry.count);
  const results = [];
  const seen = new Set();
  const boardHasLockedTiles = normalizedBoard.some(Boolean);
  let nodes = 0;
  let stopped = false;

  const spans = [];
  for (let start = 0; start < normalizedBoard.length; start += 1) {
    if (start > 0 && normalizedBoard[start - 1]) continue;
    for (let end = start + 2; end < normalizedBoard.length; end += 1) {
      if (end + 1 < normalizedBoard.length && normalizedBoard[end + 1]) continue;
      const slice = normalizedBoard.slice(start, end + 1);
      const lockedCount = slice.filter(Boolean).length;
      const emptyCount = slice.length - lockedCount;
      if ((boardHasLockedTiles && !lockedCount) || !emptyCount || emptyCount > normalizedHand.length) continue;
      if (bingoOnly && emptyCount < 8) continue;
      const boardScore = slice.reduce((sum, tile) => sum + (tile?.score ?? 0), 0);
      const highestRackScores = normalizedHand.map((tile) => tile.score).sort((a, b) => b - a).slice(0, emptyCount);
      const tileMultipliers = slice
        .map((tile, index) => tile ? 1 : (SCORE_BONUSES[bonuses[start + index]]?.tileMultiplier ?? 1))
        .filter((_, index) => !slice[index])
        .sort((a, b) => b - a);
      const equationMultiplier = slice.reduce((product, tile, index) => {
        if (tile) return product;
        return product * (SCORE_BONUSES[bonuses[start + index]]?.equationMultiplier ?? 1);
      }, 1);
      const rackEstimate = highestRackScores.reduce((sum, score, index) => sum + score * tileMultipliers[index], 0);
      spans.push({ start, end, emptyCount, estimate: (boardScore + rackEstimate) * equationMultiplier + (emptyCount >= 8 ? 40 : 0) });
    }
  }
  spans.sort((a, b) => b.estimate - a.estimate || b.emptyCount - a.emptyCount);

  const hasTimeLimit = Number.isFinite(timeLimitMs) && timeLimitMs > 0;
  const budgetReached = () => {
    if (nodes >= maxNodes) {
      stopped = true;
      return true;
    }
    nodes += 1;
    if (hasTimeLimit && (nodes & 2047) === 0 && Date.now() - started >= timeLimitMs) {
      stopped = true;
      return true;
    }
    return false;
  };

  for (const span of spans) {
    if (stopped) break;
    const cells = [];
    let handScore = 0;

    const visit = (position, usedCount, prefixState) => {
      if (stopped || budgetReached()) return;
      if (position > span.end) {
        const analysis = analyzeEquation(cells, true);
        if (!analysis.complete || usedCount < 1 || (bingoOnly && usedCount < 8)) return;
        const baseScore = cells.reduce((sum, tile) => sum + tile.score, 0);
        let equationScore = 0;
        let equationMultiplier = 1;
        cells.forEach((tile, index) => {
          const bonus = tile.source === "hand" ? SCORE_BONUSES[bonuses[span.start + index]] : null;
          equationScore += tile.score * (bonus?.tileMultiplier ?? 1);
          equationMultiplier *= bonus?.equationMultiplier ?? 1;
        });
        equationScore *= equationMultiplier;
        const bingoBonus = usedCount >= 8 ? 40 : 0;
        pushResult(results, seen, {
          start: span.start,
          end: span.end,
          cells: cells.map((cell) => ({ ...cell })),
          equation: visibleEquation(cells),
          baseScore,
          bonusScore: equationScore - baseScore,
          bingoBonus,
          score: equationScore + bingoBonus,
          usedCount,
          value: analysis.value ? `${analysis.value.n}/${analysis.value.d}` : null
        }, limit);
        return;
      }

      const locked = normalizedBoard[position];
      if (locked) {
        const nextState = advancePrefix(prefixState, locked);
        if (nextState !== PREFIX_INVALID) {
          cells.push(locked);
          visit(position + 1, usedCount, nextState);
          cells.pop();
        }
        return;
      }

      for (let typeIndex = 0; typeIndex < rackTypes.length; typeIndex += 1) {
        if (counts[typeIndex] === 0) continue;
        const entry = rackTypes[typeIndex];
        counts[typeIndex] -= 1;
        handScore += entry.tile.score;
        for (const assigned of assignmentsFor(entry.tile)) {
          const placed = { ...assigned, source: "hand" };
          const nextState = advancePrefix(prefixState, placed);
          if (nextState !== PREFIX_INVALID) {
            cells.push(placed);
            visit(position + 1, usedCount + 1, nextState);
            cells.pop();
          }
          if (stopped) break;
        }
        handScore -= entry.tile.score;
        counts[typeIndex] += 1;
        if (stopped) break;
      }
    };

    visit(span.start, 0, PREFIX_SEGMENT_START);
  }

  return {
    results: results.sort(resultComparator),
    complete: !stopped,
    nodes,
    elapsedMs: Date.now() - started,
    spansSearched: spans.length
  };
}
