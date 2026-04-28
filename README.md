# Carrot, But Userscript

Carrot, But Userscript adds a responsive rating change column to Codeforces
standings pages through Tampermonkey. It is intentionally lightweight and
minimal: no extension package, no extra panels, no settings menu, and no page
takeover.

It is inspired by [meooow25/carrot](https://github.com/meooow25/carrot), but
runs as a userscript instead of a browser extension.

## Install

[![Install Userscript](https://img.shields.io/badge/Install-Userscript-2f8f46)](https://github.com/Yan233th/carrot-but-userscript/releases/latest/download/carrot-but-userscript.user.js)

Click the button above to open Tampermonkey's one-click install page, or install
the userscript from the latest release manually:

```text
https://github.com/Yan233th/carrot-but-userscript/releases/latest/download/carrot-but-userscript.user.js
```

Tampermonkey should open its install page automatically. After installation,
open a supported Codeforces standings page and the script will add a `Δ` column.

## What You See

The added `Δ` column shows rating changes beside each participant.

- Gray underlined `Δ`: data is still loading.
- Green `Δ`: final rating changes published by Codeforces.
- Amber `Δ`: predicted rating changes before final results are available.
- `N/A`: the script could not calculate or find a rating change for that row.

The script is designed to stay out of the way and respond quickly. It only
touches the standings table, shows a loading state immediately, and then replaces
it with final or predicted rating changes when the data is ready.

## Supported Pages

Carrot, But Userscript runs on Codeforces contest and gym standings pages,
including friends standings:

- `https://codeforces.com/contest/*/standings*`
- `https://codeforces.com/gym/*/standings*`

It does not run on problem pages, submissions pages, profiles, or other
Codeforces pages.

## Updates

Tampermonkey can update the script automatically from GitHub Releases. The
installed script checks the small metadata file first, then downloads the full
script only when a newer version is available.

## Permissions

The script asks Tampermonkey for storage permission so it can temporarily keep
Codeforces rated-user data. This avoids fetching the same large list repeatedly
while you move between standings pages.

The cache is short-lived and overwritten when refreshed.

## Development

This project uses Bun and TypeScript. For local development:

```bash
bun install
```

```bash
bun run build
```

The generated files are written to `dist/`. The `*.user.js` file is the
userscript that can be installed directly in Tampermonkey; the `*.meta.js` file
is metadata for update checks.
