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

export function addPlaceholderColumn(standings: StandingsTable, contestId: string): void {
  for (const [index, row] of standings.rows.entries()) {
    row.querySelector('th:last-child, td:last-child')?.classList.remove('right');

    const cell = document.createElement(index === 0 ? 'th' : 'td');
    cell.classList.add(CELL_CLASS);

    if (index === 0) {
      cell.classList.add('top', 'right', HEADER_CLASS);
      cell.title = `Carrot, But Userscript is active for contest ${contestId}`;
      cell.textContent = 'CBU';
    } else {
      cell.classList.add('right');
      cell.textContent = index === standings.rows.length - 1 ? '' : '...';
    }

    row.append(cell);
  }
}
