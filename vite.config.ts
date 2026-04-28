import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

const releaseBaseUrl = 'https://github.com/Yan233th/carrot-but-userscript/releases/latest/download';
const userscriptVersion = process.env.USERSCRIPT_VERSION;

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'Carrot, But Userscript',
        namespace: 'https://github.com/Yan233th/carrot-but-userscript',
        version: userscriptVersion,
        author: 'Yan233_',
        description: 'A Tampermonkey userscript for Codeforces rating prediction.',
        license: 'AGPL-3.0-or-later',
        homepageURL: 'https://github.com/Yan233th/carrot-but-userscript',
        supportURL: 'https://github.com/Yan233th/carrot-but-userscript/issues',
        match: [
          'https://codeforces.com/contest/*/standings*',
          'https://codeforces.com/gym/*/standings*',
        ],
        grant: ['GM_getValue', 'GM_setValue'],
        updateURL: `${releaseBaseUrl}/carrot-but-userscript.meta.js`,
        downloadURL: `${releaseBaseUrl}/carrot-but-userscript.user.js`,
      },
      build: {
        metaFileName: true,
      },
    }),
  ],
});
