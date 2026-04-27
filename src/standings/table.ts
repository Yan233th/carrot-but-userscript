import type { Prediction } from '../rating/predict';

const CELL_CLASS = 'carrot-but-userscript-cell';
const HEADER_CLASS = 'carrot-but-userscript-header';
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

export function addFinalDeltaColumn(
  standings: StandingsTable,
  finalDeltas: Map<string, number> | null,
): ColumnRenderStats {
  return addDeltaColumn(standings, 'Final rating change', FINAL_HEADER_CLASS, (cell, row, isFooterRow) => {
    return renderFinalDeltaCell(cell, row, finalDeltas, isFooterRow);
  });
}

export function addLoadingColumn(standings: StandingsTable): ColumnRenderStats {
  return addDeltaColumn(standings, 'Loading rating changes', LOADING_HEADER_CLASS, (cell, _row, isFooterRow) => {
    cell.textContent = isFooterRow ? '' : '\u2026';
    cell.classList.add('carrot-but-userscript-muted');
    return !isFooterRow;
  });
}

export function clearCarrotColumns(standings: StandingsTable): void {
  for (const row of standings.rows) {
    row.querySelectorAll(`.${CELL_CLASS}`).forEach((cell) => cell.remove());
    row.querySelector('th:last-child, td:last-child')?.classList.add('right');
  }
}

export function addPredictedDeltaColumn(standings: StandingsTable, predictions: Prediction[] | null): ColumnRenderStats {
  const predictionMap = predictions
    ? new Map(predictions.map((prediction) => [prediction.handle, prediction]))
    : null;
  return addDeltaColumn(standings, 'Predicted rating change', PREDICTED_HEADER_CLASS, (cell, row, isFooterRow) => {
    return renderPredictedDeltaCell(cell, row, predictionMap, isFooterRow);
  });
}

function addDeltaColumn(
  standings: StandingsTable,
  title: string,
  headerClass: string,
  render: (cell: HTMLElement, row: HTMLTableRowElement, isFooterRow: boolean) => boolean,
): ColumnRenderStats {
  let dataRows = 0;
  let matchedRows = 0;

  for (const [index, row] of standings.rows.entries()) {
    row.querySelector('th:last-child, td:last-child')?.classList.remove('right');

    const cell = document.createElement(index === 0 ? 'th' : 'td');
    cell.classList.add(CELL_CLASS);

    if (index === 0) {
      cell.classList.add('top', 'right', HEADER_CLASS, headerClass);
      cell.title = title;
      cell.textContent = '\u0394';
    } else {
      cell.classList.add('right');
      const isFooterRow = index === standings.rows.length - 1;
      if (!isFooterRow) {
        dataRows += 1;
      }
      if (render(cell, row, isFooterRow)) {
        matchedRows += 1;
      }
    }

    row.append(cell);
  }

  return { matchedRows, dataRows };
}

function renderFinalDeltaCell(
  cell: HTMLElement,
  row: HTMLTableRowElement,
  finalDeltas: Map<string, number> | null,
  isFooterRow: boolean,
): boolean {
  if (isFooterRow) {
    cell.textContent = '';
    return false;
  }

  const handle = getHandle(row);
  const delta = handle && finalDeltas?.get(handle);
  if (typeof delta !== 'number') {
    cell.textContent = 'N/A';
    cell.title = finalDeltas ? 'No rating change found for this row' : 'Rating changes unavailable';
    cell.classList.add('carrot-but-userscript-muted');
    return false;
  }

  cell.textContent = delta > 0 ? `+${delta}` : String(delta);
  cell.classList.add(delta > 0 ? 'carrot-but-userscript-positive' : 'carrot-but-userscript-negative');
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
  cell.title = `Performance: ${prediction.performance === Infinity ? 'Infinity' : prediction.performance}`;
  cell.classList.add(
    prediction.delta > 0 ? 'carrot-but-userscript-positive' : 'carrot-but-userscript-negative',
  );
  return true;
}

function getHandle(row: HTMLTableRowElement): string | null {
  const contestantCell = row.querySelector('td.contestant-cell');
  const profileLink = contestantCell?.querySelector<HTMLAnchorElement>('a[href*="/profile/"]');
  return profileLink?.textContent?.trim() || null;
}
