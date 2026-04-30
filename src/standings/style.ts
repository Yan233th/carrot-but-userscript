export function installStandingsStyles(document: Document): void {
  const style = document.createElement('style');
  style.textContent = `
.carrot-but-userscript-cell {
  width: 4em;
  min-width: 4em;
  text-align: center;
}

.carrot-but-userscript-rank-cell {
  width: 6.5em;
  min-width: 6.5em;
}

.carrot-but-userscript-rank-up-achieved {
  background-color: #f2fff2;
}

.carrot-but-userscript-rank-up-achieved.dark {
  background-color: #ebf8eb;
}

tr.highlighted-row .carrot-but-userscript-rank-up-achieved {
  background-color: #d1eef2 !important;
}

.carrot-but-userscript-header {
  font-weight: bold;
}

.carrot-but-userscript-header-final {
  color: green;
}

.carrot-but-userscript-header-loading {
  color: #9aa0a6;
  text-decoration-line: underline;
  text-decoration-thickness: 2px;
  text-decoration-color: #c4c7cc;
  text-underline-offset: 0.16em;
}

.carrot-but-userscript-header-predicted {
  color: #9b6a00;
}

.carrot-but-userscript-positive {
  color: green;
  font-weight: bold;
}

.carrot-but-userscript-negative {
  color: gray;
  font-weight: bold;
}

.carrot-but-userscript-muted {
  color: lightgray;
  font-weight: bold;
}

.carrot-but-userscript-performance {
  font-weight: bold;
}

.carrot-but-userscript-rank-helper {
  align-items: center;
  display: inline-flex;
  font-weight: bold;
}

.carrot-but-userscript-rank-delta {
  line-height: 1;
}

.carrot-but-userscript-rank-abbr {
  display: inline-block;
  line-height: 1;
}

.carrot-but-userscript-rank-arrow {
  line-height: 1;
  padding-left: 0.5em;
  padding-right: 0.5em;
}

.carrot-but-userscript-cache-panel {
  align-items: center;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid #dddddd;
  border-radius: 4px;
  bottom: 0.6em;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  color: #777;
  display: inline-flex;
  font-size: 0.92em;
  gap: 0.45em;
  max-width: calc(100vw - 1.2em);
  overflow-x: auto;
  padding: 0.35em 0.45em;
  position: fixed;
  right: 0.6em;
  white-space: nowrap;
  z-index: 20;
}

.carrot-but-userscript-cache-status {
  border: 1px solid #d8d8d8;
  border-radius: 999px;
  padding: 0.12em 0.55em;
  white-space: nowrap;
}

.carrot-but-userscript-cache-hit {
  border-color: #9dcc9d;
  color: green;
}

.carrot-but-userscript-cache-miss {
  border-color: #d4c090;
  color: #9b6a00;
}

.carrot-but-userscript-cache-live {
  border-color: #b9c7d8;
  color: #536f8a;
}

.carrot-but-userscript-cache-clear {
  background: #f7f7f7;
  border: 1px solid #cfcfcf;
  border-radius: 3px;
  color: #555;
  cursor: pointer;
  font: inherit;
  padding: 0.12em 0.55em;
}

.carrot-but-userscript-cache-clear:hover {
  background: #eeeeee;
}
`;
  document.head.append(style);
}
