# Carrot, But Userscript

A TypeScript userscript for Codeforces rating prediction, inspired by
[meooow25/carrot](https://github.com/meooow25/carrot).

## Development

Install dependencies:

```bash
bun install
```

Build the Tampermonkey userscript:

```bash
bun run build
```

Install `dist/carrot-but-userscript.user.js` in Tampermonkey, then open a
Codeforces standings page. Finished rated contests should show a final rating
change column.
