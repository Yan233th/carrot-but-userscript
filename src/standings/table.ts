import type { Prediction } from '../rating/predict';

const CELL_CLASS = 'carrot-but-userscript-cell';
const HEADER_CLASS = 'carrot-but-userscript-header';

export interface StandingsTable {
  table: HTMLTableElement;
  rows: HTMLTableRowElement[];
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
): void {
  addDeltaColumn(standings, 'Final rating change', '\u0394', (cell, row, isFooterRow) => {
    renderFinalDeltaCell(cell, row, finalDeltas, isFooterRow);
  });
}

export function addPredictedDeltaColumn(standings: StandingsTable, predictions: Prediction[]): void {
  const predictionMap = new Map(predictions.map((prediction) => [prediction.handle, prediction]));
  addDeltaColumn(standings, 'Predicted rating change', '\u0394', (cell, row, isFooterRow) => {
    renderPredictedDeltaCell(cell, row, predictionMap, isFooterRow);
  });
}

function addDeltaColumn(
  standings: StandingsTable,
  title: string,
  label: string,
  render: (cell: HTMLElement, row: HTMLTableRowElement, isFooterRow: boolean) => void,
): void {
  for (const [index, row] of standings.rows.entries()) {
    row.querySelector('th:last-child, td:last-child')?.classList.remove('right');

    const cell = document.createElement(index === 0 ? 'th' : 'td');
    cell.classList.add(CELL_CLASS);

    if (index === 0) {
      cell.classList.add('top', 'right', HEADER_CLASS);
      cell.title = title;
      cell.textContent = label;
    } else {
      cell.classList.add('right');
      render(cell, row, index === standings.rows.length - 1);
    }

    row.append(cell);
  }
}

function renderFinalDeltaCell(
  cell: HTMLElement,
  row: HTMLTableRowElement,
  finalDeltas: Map<string, number> | null,
  isFooterRow: boolean,
): void {
  if (isFooterRow) {
    cell.textContent = '';
    return;
  }

  const handle = getHandle(row);
  const delta = handle && finalDeltas?.get(handle);
  if (typeof delta !== 'number') {
    cell.textContent = 'N/A';
    cell.title = finalDeltas ? 'No rating change found for this row' : 'Rating changes unavailable';
    cell.classList.add('carrot-but-userscript-muted');
    return;
  }

  cell.textContent = delta > 0 ? `+${delta}` : String(delta);
  cell.classList.add(delta > 0 ? 'carrot-but-userscript-positive' : 'carrot-but-userscript-negative');
}

function renderPredictedDeltaCell(
  cell: HTMLElement,
  row: HTMLTableRowElement,
  predictions: Map<string, Prediction>,
  isFooterRow: boolean,
): void {
  if (isFooterRow) {
    cell.textContent = '';
    return;
  }

  const handle = getHandle(row);
  const prediction = handle ? predictions.get(handle) : undefined;
  if (!prediction) {
    cell.textContent = 'N/A';
    cell.title = 'No prediction found for this row';
    cell.classList.add('carrot-but-userscript-muted');
    return;
  }

  cell.textContent = prediction.delta > 0 ? `+${prediction.delta}` : String(prediction.delta);
  cell.title = `Performance: ${prediction.performance === Infinity ? 'Infinity' : prediction.performance}`;
  cell.classList.add(
    prediction.delta > 0 ? 'carrot-but-userscript-positive' : 'carrot-but-userscript-negative',
  );
}

function getHandle(row: HTMLTableRowElement): string | null {
  const contestantCell = row.querySelector('td.contestant-cell');
  const profileLink = contestantCell?.querySelector<HTMLAnchorElement>('a[href*="/profile/"]');
  return profileLink?.textContent?.trim() || null;
}
