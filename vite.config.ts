import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'Carrot, But Userscript',
        namespace: 'https://github.com/Yan233_/carrot-but-userscript',
        description: 'A Tampermonkey userscript for Codeforces rating prediction.',
        license: 'AGPL-3.0-or-later',
        match: [
          'https://codeforces.com/contest/*/standings*',
          'https://codeforces.com/gym/*/standings*',
        ],
      },
    }),
  ],
});
