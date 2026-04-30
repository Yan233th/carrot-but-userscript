import { clearCachedValues } from '../storage/cache';

const PANEL_CLASS = 'carrot-but-userscript-cache-panel';
const STATUS_CLASS = 'carrot-but-userscript-cache-status';
const HIT_CLASS = 'carrot-but-userscript-cache-hit';
const MISS_CLASS = 'carrot-but-userscript-cache-miss';
const LIVE_CLASS = 'carrot-but-userscript-cache-live';
const CLEAR_BUTTON_CLASS = 'carrot-but-userscript-cache-clear';

export type CacheState = 'hit' | 'miss' | 'live' | 'unused' | 'cleared';

export interface CacheStatusPanel {
  set: (name: string, state: CacheState) => void;
}

export function addCacheStatusPanel(table: HTMLTableElement): CacheStatusPanel {
  const panel = document.createElement('div');
  panel.classList.add(PANEL_CLASS);

  const label = document.createElement('span');
  label.textContent = 'Contest cache';
  panel.append(label);

  const statuses = new Map<string, HTMLSpanElement>();
  for (const name of ['metadata', 'rating', 'standings', 'rated-users']) {
    const status = makeStatus(name, 'unused');
    statuses.set(name, status);
    panel.append(status);
  }

  const clearButton = document.createElement('button');
  clearButton.type = 'button';
  clearButton.classList.add(CLEAR_BUTTON_CLASS);
  clearButton.textContent = 'Clear';
  clearButton.title = 'Clear Carrot, But Userscript cache';
  clearButton.addEventListener('click', () => {
    void clearCachedValues().then(() => {
      for (const [name, status] of statuses) {
        renderStatus(status, name, 'cleared');
      }
    });
  });
  panel.append(clearButton);

  table.parentElement?.append(panel);

  return {
    set(name, state) {
      const status = statuses.get(name);
      if (status) {
        renderStatus(status, name, state);
      }
    },
  };
}

function makeStatus(name: string, state: CacheState): HTMLSpanElement {
  const status = document.createElement('span');
  status.classList.add(STATUS_CLASS);
  renderStatus(status, name, state);
  return status;
}

function renderStatus(status: HTMLSpanElement, name: string, state: CacheState): void {
  status.classList.remove(HIT_CLASS, MISS_CLASS, LIVE_CLASS);
  status.textContent = `${name}: ${state}`;
  if (state === 'hit') {
    status.classList.add(HIT_CLASS);
  } else if (state === 'miss') {
    status.classList.add(MISS_CLASS);
  } else if (state === 'live') {
    status.classList.add(LIVE_CLASS);
  }
}
