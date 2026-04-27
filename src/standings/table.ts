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
  for (const [index, row] of standings.rows.entries()) {
    row.querySelector('th:last-child, td:last-child')?.classList.remove('right');

    const cell = document.createElement(index === 0 ? 'th' : 'td');
    cell.classList.add(CELL_CLASS);

    if (index === 0) {
      cell.classList.add('top', 'right', HEADER_CLASS);
      cell.title = 'Final rating change';
      cell.textContent = '\u0394';
    } else {
      cell.classList.add('right');
      renderFinalDeltaCell(cell, row, finalDeltas, index === standings.rows.length - 1);
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

function getHandle(row: HTMLTableRowElement): string | null {
  const contestantCell = row.querySelector('td.contestant-cell');
  const profileLink = contestantCell?.querySelector<HTMLAnchorElement>('a[href*="/profile/"]');
  return profileLink?.textContent?.trim() || null;
}
