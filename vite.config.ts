import { defineConfig } from 'vite';
import { growiReactResolver } from './vite/growi-react-resolver.ts';

// https://vite.dev/config/
export default defineConfig({
  plugins: [growiReactResolver()],
  // JSX settings come from tsconfig.json ("jsx": "react-jsx"). Our own JSX therefore
  // compiles to `react/jsx-runtime` imports, which growiReactResolver redirects.
  build: {
    manifest: true,
    sourcemap: true,
    rollupOptions: {
      // GROWI looks the entry up in the manifest under this exact key.
      input: ['/client-entry.tsx'],
      output: {
        /*
         * GROWI reads the stylesheet href as `manifest['client-entry.tsx'].css`,
         * interpolating an array into a string. More than one CSS chunk would
         * produce `"a.css,b.css"` and 404. Keeping everything in one chunk also
         * keeps the plugin to a single <script>, with no relative chunk fetches.
         */
        codeSplitting: false,
      },
    },
  },
});
