import type { Prediction } from '../rating/predict';

const CELL_CLASS = 'carrot-but-userscript-cell';
const HEADER_CLASS = 'carrot-but-userscript-header';
const PERFORMANCE_CELL_CLASS = 'carrot-but-userscript-performance-cell';
const DELTA_CELL_CLASS = 'carrot-but-userscript-delta-cell';
const FINAL_HEADER_CLASS = 'carrot-but-userscript-header-final';
const LOADING_HEADER_CLASS = 'carrot-but-userscript-header-loading';
const PREDICTED_HEADER_CLASS = 'carrot-but-userscript-header-predicted';

export interface StandingsTable {
  table: HTMLTableElement;
  rows: HTMLTableRowElement[];
}

export interface ColumnRenderStats {
  matchedRows: number;
  dataRows: number;
}

export function findStandingsTable(document: Document): StandingsTable | null {
  const table = document.querySelector<HTMLTableElement>('table.standings');
  if (!table) {
    return null;
  }

  const rows = Array.from(table.querySelectorAll<HTMLTableRowElement>('tbody tr'));
  if (rows.length === 0) {
    return null;
  }

  return { table, rows };
}

export function addFinalRatingColumns(
  standings: StandingsTable,
  finalResults: Map<string, FinalRatingResult> | null,
): ColumnRenderStats {
  return addRatingColumns(standings, 'Final performance', 'Final rating change', FINAL_HEADER_CLASS, {
    performance: (cell, row, isFooterRow) => renderFinalPerformanceCell(cell, row, finalResults, isFooterRow),
    delta: (cell, row, isFooterRow) => renderFinalDeltaCell(cell, row, finalResults, isFooterRow),
  });
}

export function addLoadingColumn(standings: StandingsTable): ColumnRenderStats {
  return addRatingColumns(standings, 'Loading performance', 'Loading rating changes', LOADING_HEADER_CLASS, {
    performance: (cell, _row, isFooterRow) => renderLoadingCell(cell, isFooterRow),
    delta: (cell, _row, isFooterRow) => renderLoadingCell(cell, isFooterRow),
  });
}

function renderLoadingCell(cell: HTMLElement, isFooterRow: boolean): boolean {
  cell.textContent = isFooterRow ? '' : '\u2026';
  if (!isFooterRow) {
    cell.classList.add('carrot-but-userscript-muted');
  }
  return !isFooterRow;
}

export function clearCarrotColumns(standings: StandingsTable): void {
  for (const row of standings.rows) {
    row.querySelectorAll(`.${CELL_CLASS}`).forEach((cell) => cell.remove());
    row.querySelector('th:last-child, td:last-child')?.classList.add('right');
  }
}

export function addPredictedRatingColumns(standings: StandingsTable, predictions: Prediction[] | null): ColumnRenderStats {
  const predictionMap = predictions
    ? new Map(predictions.map((prediction) => [prediction.handle, prediction]))
    : null;
  return addRatingColumns(standings, 'Predicted performance', 'Predicted rating change', PREDICTED_HEADER_CLASS, {
    performance: (cell, row, isFooterRow) => renderPredictedPerformanceCell(cell, row, predictionMap, isFooterRow),
    delta: (cell, row, isFooterRow) => renderPredictedDeltaCell(cell, row, predictionMap, isFooterRow),
  });
}

export interface FinalRatingResult {
  delta: number;
  performance?: number;
}

function addRatingColumns(
  standings: StandingsTable,
  performanceTitle: string,
  deltaTitle: string,
  headerClass: string,
  render: {
    performance: (cell: HTMLElement, row: HTMLTableRowElement, isFooterRow: boolean) => boolean;
    delta: (cell: HTMLElement, row: HTMLTableRowElement, isFooterRow: boolean) => boolean;
  },
): ColumnRenderStats {
  let dataRows = 0;
  let matchedRows = 0;

  for (const [index, row] of standings.rows.entries()) {
    row.querySelector('th:last-child, td:last-child')?.classList.remove('right');

    const performanceCell = document.createElement(index === 0 ? 'th' : 'td');
    const deltaCell = document.createElement(index === 0 ? 'th' : 'td');
    performanceCell.classList.add(CELL_CLASS, PERFORMANCE_CELL_CLASS);
    deltaCell.classList.add(CELL_CLASS, DELTA_CELL_CLASS);

    if (index === 0) {
      performanceCell.classList.add('top', HEADER_CLASS, headerClass);
      performanceCell.title = performanceTitle;
      performanceCell.textContent = '\u03A0';

      deltaCell.classList.add('top', 'right', HEADER_CLASS, headerClass);
      deltaCell.title = deltaTitle;
      deltaCell.textContent = '\u0394';
    } else {
      deltaCell.classList.add('right');
      const isFooterRow = index === standings.rows.length - 1;
      if (!isFooterRow) {
        dataRows += 1;
      }
      const hasPerformance = render.performance(performanceCell, row, isFooterRow);
      const hasDelta = render.delta(deltaCell, row, isFooterRow);
      if (hasPerformance || hasDelta) {
        matchedRows += 1;
      }
    }

    row.append(performanceCell, deltaCell);
  }

  return { matchedRows, dataRows };
}

function renderFinalDeltaCell(
  cell: HTMLElement,
  row: HTMLTableRowElement,
  finalResults: Map<string, FinalRatingResult> | null,
  isFooterRow: boolean,
): boolean {
  if (isFooterRow) {
    cell.textContent = '';
    return false;
  }

  const handle = getHandle(row);
  const delta = handle && finalResults?.get(handle)?.delta;
  if (typeof delta !== 'number') {
    cell.textContent = 'N/A';
    cell.title = finalResults ? 'No rating change found for this row' : 'Rating changes unavailable';
    cell.classList.add('carrot-but-userscript-muted');
    return false;
  }

  cell.textContent = delta > 0 ? `+${delta}` : String(delta);
  cell.classList.add(delta > 0 ? 'carrot-but-userscript-positive' : 'carrot-but-userscript-negative');
  return true;
}

function renderFinalPerformanceCell(
  cell: HTMLElement,
  row: HTMLTableRowElement,
  finalResults: Map<string, FinalRatingResult> | null,
  isFooterRow: boolean,
): boolean {
  if (isFooterRow) {
    cell.textContent = '';
    return false;
  }

  const handle = getHandle(row);
  const performance = handle && finalResults?.get(handle)?.performance;
  if (typeof performance !== 'number') {
    cell.textContent = 'N/A';
    cell.title = finalResults ? 'No performance found for this row' : 'Performance unavailable';
    cell.classList.add('carrot-but-userscript-muted');
    return false;
  }

  renderPerformance(cell, performance);
  return true;
}

function renderPredictedDeltaCell(
  cell: HTMLElement,
  row: HTMLTableRowElement,
  predictions: Map<string, Prediction> | null,
  isFooterRow: boolean,
): boolean {
  if (isFooterRow) {
    cell.textContent = '';
    return false;
  }

  const handle = getHandle(row);
  const prediction = handle ? predictions?.get(handle) : undefined;
  if (!prediction) {
    cell.textContent = 'N/A';
    cell.title = predictions ? 'No prediction found for this row' : 'Prediction unavailable';
    cell.classList.add('carrot-but-userscript-muted');
    return false;
  }

  cell.textContent = prediction.delta > 0 ? `+${prediction.delta}` : String(prediction.delta);
  cell.classList.add(
    prediction.delta > 0 ? 'carrot-but-userscript-positive' : 'carrot-but-userscript-negative',
  );
  return true;
}

function renderPredictedPerformanceCell(
  cell: HTMLElement,
  row: HTMLTableRowElement,
  predictions: Map<string, Prediction> | null,
  isFooterRow: boolean,
): boolean {
  if (isFooterRow) {
    cell.textContent = '';
    return false;
  }

  const handle = getHandle(row);
  const prediction = handle ? predictions?.get(handle) : undefined;
  if (!prediction) {
    cell.textContent = 'N/A';
    cell.title = predictions ? 'No prediction found for this row' : 'Prediction unavailable';
    cell.classList.add('carrot-but-userscript-muted');
    return false;
  }

  renderPerformance(cell, prediction.performance);
  return true;
}

function renderPerformance(cell: HTMLElement, performance: number): void {
  cell.textContent = performance === Infinity ? '\u221E' : String(performance);
  cell.classList.add('carrot-but-userscript-performance');
  const colorClass = getRatingColorClass(performance);
  if (colorClass) {
    cell.classList.add(colorClass);
  }
}

function getRatingColorClass(rating: number): string | null {
  if (rating === Infinity) {
    return null;
  }
  if (rating < 1200) return 'user-gray';
  if (rating < 1400) return 'user-green';
  if (rating < 1600) return 'user-cyan';
  if (rating < 1900) return 'user-blue';
  if (rating < 2100) return 'user-violet';
  if (rating < 2400) return 'user-orange';
  if (rating < 3000) return 'user-red';
  return 'user-legendary';
}

function getHandle(row: HTMLTableRowElement): string | null {
  const contestantCell = row.querySelector('td.contestant-cell');
  const profileLink = contestantCell?.querySelector<HTMLAnchorElement>('a[href*="/profile/"]');
  return profileLink?.textContent?.trim() || null;
}
