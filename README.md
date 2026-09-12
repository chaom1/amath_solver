# A-Math Line Solver

A-Math Line Solver is a bilingual, browser-based tool for finding the highest-scoring legal A-Math equations that can be formed on a single line of the board. Users enter any tiles already fixed on the board, add the tiles in their hand, and the solver searches for possible equations before ranking the best results by score.

The solver preserves the identity and point value of every physical tile, including blank and flexible-operation tiles. It validates equation structure, supports standard operator precedence and chained equalities, and uses exact fractional arithmetic so its results do not depend on rounding. Scores include the value of all tiles in an equation and a 40-point bonus when eight tiles from the hand are used.

The project supports board lines from 3 to 15 cells, hands of up to 15 tiles, and displays up to 30 ranked results. It can analyze an empty-board first move or build an equation through locked tiles already on the selected line. Board multipliers are not included. To keep large searches responsive, the solver uses an analysis limit and clearly marks results as partial when that limit is reached.
