import { reactRouter } from "@react-router/dev/vite";
import autoprefixer from "autoprefixer";
import tailwindcss from "tailwindcss";
import { defineConfig } from "vite";
import importMetaUrlPlugin from "@codingame/esbuild-import-meta-url-plugin";
import vsixPlugin from "@codingame/monaco-vscode-rollup-vsix-plugin";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ isSsrBuild, command }) => ({
  // build: {
  //   rollupOptions: isSsrBuild
  //     ? {
  //         input: "./server/app.ts",
  //       }
  //     : undefined,
  // },
  css: {
    postcss: {
      plugins: [tailwindcss, autoprefixer],
    },
  },
  // ssr: {
  //   noExternal: command === "build" ? true : undefined,
  // },
  optimizeDeps: {
    esbuildOptions: {
      plugins: [importMetaUrlPlugin],
    },
    include: ["vscode-textmate", "vscode-oniguruma"],
  },
  plugins: [reactRouter(), tsconfigPaths(), vsixPlugin()],
  worker: {
    format: "es",
  },
}));
