# Carrot, But Userscript

Carrot, But Userscript adds compact rating insight columns to Codeforces
standings pages through Tampermonkey.

Designed for a **fast**, **responsive**, **lightweight**, and **stable**
standings experience. It does not install a browser extension package, add a
settings page, or take over the Codeforces interface.

## Install

Install [Tampermonkey](https://www.tampermonkey.net/) first, then install the
userscript:

[![Install Userscript](https://img.shields.io/badge/Install-Userscript-2f8f46)](https://github.com/Yan233th/carrot-but-userscript/releases/latest/download/carrot-but-userscript.user.js)

Click the button above to open Tampermonkey's one-click install page, or install
the userscript from the latest release manually:

```text
https://github.com/Yan233th/carrot-but-userscript/releases/latest/download/carrot-but-userscript.user.js
```

After installation, open a supported Codeforces standings page. The script will
add rating columns directly to the standings table.

## What It Adds

The script adds three columns:

- `Π`: performance rating, showing the rating level the row's contest result
  resembles.
- `Δ`: rating change, showing predicted or official rating gain/loss.
- `Rank`: rank movement. During prediction it shows the delta needed for the
  next rank; after official rating changes are published it shows the actual
  rank movement, or `—` for no change.

The columns appear in-place, beside the Codeforces standings table. Loading is
shown immediately, then replaced with either final official data or predictions.
Rows that cannot be matched show `N/A`.

## Data States

The script has two main states:

- **Predicted**: shown while the contest is running, during system testing, or
  after final standings are visible but official rating changes are not yet
  published.
- **Final**: shown after Codeforces publishes official rating changes. Official
  `Δ` values come from Codeforces; performance is calculated from the final
  standings and the official pre-contest ratings.

Header color indicates the state:

- Gray underlined headers: loading.
- Amber headers: predictions.
- Green headers: official final rating changes.

## Cache

The script keeps a small local cache in Tampermonkey storage to avoid repeated
Codeforces API requests when you reload a standings page or move between related
pages.

Current cache behavior:

- Contest metadata: finished contests are cached for 24 hours; active contests
  are not cached.
- Standings: active or not-yet-final standings are cached for 30 seconds; final
  standings are cached for 24 hours.
- Rating changes: published official rating changes are cached for 24 hours;
  empty pending responses are not cached.
- Rated users: the Codeforces rated-user list is cached for 1 hour.
- Empty pending rating-change responses, rendered table cells, and prediction
  results are not stored.

A small `Contest cache` panel shows cache status for the current page. Its
`Clear` button clears all current-version cache entries created by this
userscript.

Cache panel states:

- `hit`: cached data was reused.
- `miss`: cacheable data was fetched and stored because no fresh cache existed.
- `live`: the data is intentionally not cached, such as active contest metadata
  or empty pending rating-change responses.
- `unused`: that data source was not needed for the current page state.
- `cleared`: current-version cache entries were cleared from the panel.

If you upgraded from an early cache build and still see a browser error about a
message exceeding `64MiB`, clear this userscript's Tampermonkey storage once.
Current versions store cache entries separately to avoid that browser extension
message-size limit.

## Limits

The script uses data available to the current page and the public Codeforces
API. It does not bypass Codeforces permissions, hidden frozen standings, private
gym access, or account-specific friends-list restrictions.

When `contest.standings` is unavailable because of Codeforces API access rules
or temporary HTML/Cloudflare responses, the script can rebuild usable standings
from public contest submissions and hacks. This fallback is meant to keep active
and just-finished contests usable; official final rating changes still come from
Codeforces.

Team contests, clearly unrated contests, and very old finished contests without
official rating changes may show `N/A` instead of predictions.

## Supported Pages

Carrot, But Userscript runs on Codeforces contest and gym standings pages,
including friends standings:

- `https://codeforces.com/contest/*/standings*`
- `https://codeforces.com/gym/*/standings*`

It does not run on problem pages, submission pages, profiles, or other
Codeforces pages.

## Updates

Tampermonkey can update the script automatically from GitHub Releases. The
installed script checks a small metadata file first, then downloads the full
`*.user.js` file only when a newer version is available.

## Acknowledgements

Thanks to [meooow25/carrot](https://github.com/meooow25/carrot), the original
browser extension for Codeforces rating insight columns.

Thanks also to
[wuyuqian114514/carrot-plus](https://github.com/wuyuqian114514/carrot-plus) for
documenting practical Codeforces behavior changes and fallback data paths.

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
