export function installStandingsStyles(document: Document): void {
  const style = document.createElement('style');
  style.textContent = `
.carrot-but-userscript-cell {
  min-width: 4em;
  text-align: center;
}

.carrot-but-userscript-header {
  font-weight: bold;
}
`;
  document.head.append(style);
}
