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
  font-weight: bold;
}

.carrot-but-userscript-rank-abbr {
  display: inline-block;
  vertical-align: middle;
}

.carrot-but-userscript-rank-arrow {
  padding-left: 0.5em;
  padding-right: 0.5em;
  vertical-align: middle;
}
`;
  document.head.append(style);
}
