/**
 * Shared between MarketTable's colhead row and each MarketRow so their
 * columns stay aligned — kept as one literal constant (not duplicated,
 * not interpolated) rather than importing MarketRow from MarketTable or
 * vice versa, which would be circular. Grid at >=761px, stacked "card"
 * layout below it.
 */
export const MARKET_ROW_GRID_COLS_CLASS =
  "min-[761px]:grid-cols-[2.4fr_1.5fr_1.1fr_0.8fr_0.8fr_28px]";
