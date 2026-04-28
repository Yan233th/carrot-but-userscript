# Carrot, But Userscript

Carrot, But Userscript adds compact rating insight columns to Codeforces
standings pages through Tampermonkey.

Built for a **fast**, **responsive**, **lightweight**, and **stable** experience:
no browser extension package, no extra panels, no settings menu, and no page
takeover.

## Install

Install [Tampermonkey](https://www.tampermonkey.net/) first, then install the
userscript:

[![Install Userscript](https://img.shields.io/badge/Install-Userscript-2f8f46)](https://github.com/Yan233th/carrot-but-userscript/releases/latest/download/carrot-but-userscript.user.js)

Click the button above to open Tampermonkey's one-click install page, or install
the userscript from the latest release manually:

```text
https://github.com/Yan233th/carrot-but-userscript/releases/latest/download/carrot-but-userscript.user.js
```

Tampermonkey should open its install page automatically. After installation,
open a supported Codeforces standings page and the script will add compact rating
columns.

## What You See

The script adds three compact columns to the standings table:

- `Π`: performance rating, showing the rating level your contest performance resembles.
- `Δ`: rating change, showing how much rating is gained or lost.
- `Rank`: rank movement. During prediction, it shows the delta needed for the
  next rank and lightly tints the cell when the predicted delta reaches that
  threshold. After official rating changes are published, it shows actual rank
  changes or `—` for no change.

The headers show the current data state:

- Gray underlined headers mean data is loading.
- Green headers mean official Codeforces rating changes are being shown.
- Amber headers mean predictions are being shown before official changes are available.
- `N/A` means the script could not calculate or find data for that row.

The script is designed to stay out of the way and respond quickly. It only
touches the standings table, shows a loading state immediately, and then replaces
it with final or predicted rating data when the data is ready.

## Data And Limits

The script uses Codeforces data available to the current page and public API. It
does not bypass Codeforces permissions, hidden frozen-standings data, private gym
access, or your account-specific friends list.

Standings, submissions, hacks, rating changes, and prediction results are not
cached. Each standings page load uses fresh Codeforces data for the current
contest state.

For finished contests, official `contest.ratingChanges` data is preferred. If
the final standings are visible but rating changes have not been published yet,
the script keeps showing predictions instead of pretending final data exists.

When `contest.standings` is unavailable because of current Codeforces API access
rules or temporary HTML/Cloudflare responses, the script can rebuild standings
from `contest.status` as a fallback. This keeps active and just-finished rounds
usable, but final official rating changes still come from Codeforces.

## Acknowledgements

Thanks to [meooow25/carrot](https://github.com/meooow25/carrot), the original
browser extension for showing Codeforces rating deltas, rank-up deltas, rank
changes, and performance ratings on standings pages.

Thanks also to
[wuyuqian114514/carrot-plus](https://github.com/wuyuqian114514/carrot-plus) for
documenting and handling practical Codeforces behavior changes, including
fallback data paths when `contest.standings` is unavailable.

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

Only the global rated-user list is kept briefly. Contest standings, submissions,
hacks, rating changes, and prediction results are not stored.

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
