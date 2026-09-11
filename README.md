# A-Math Line Solver

A bilingual, browser-only solver for finding and ranking legal A-Math equations along one board line. It models physical tile identity, locked cells, flexible and blank assignments, exact fractional arithmetic, and the 40-point eight-tile bingo bonus.

## Run locally

```bash
npm run dev
```

Then open <http://localhost:4173>.

## Verify

```bash
npm test
npm run check
```

No packages or build step are required. The site can be deployed to any static host.

## First-version scope

- One selectable line of 3–15 cells
- Empty-board first moves, or connection to at least one locked tile when locked tiles exist
- Up to 15 hand tiles and the top 30 ranked results
- Normal cells only; board multipliers are intentionally deferred
- A search guard keeps unusually large analysis hands responsive. If it is reached, the interface labels the results as partial.
