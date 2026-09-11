import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/** Classic <script> at end of body. IIFE in <head> runs before #root exists → blank WebView. */
function apkClassicHtml(): Plugin {
  const rewrite = (html: string) => {
    const srcs: string[] = [];
    let out = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (block) => {
      const src = block.match(/\bsrc=["']([^"']+)["']/i)?.[1];
      if (!src) return block;
      srcs.push(src.replace(/&/g, "&"));
      return "";
    });
    out = out.replace(/\s*(type=["']module["']|crossorigin(=["'][^"']*["'])?)/gi, "");
    const tags = srcs.map((src) => `<script src="${src}"></script>`).join("\n    ");
    if (out.includes("</body>")) {
      out = out.replace("</body>", `    ${tags}\n  </body>`);
    } else {
      out += `\n${tags}\n`;
    }
    return out;
  };

  return {
    name: "apk-classic-html",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        return rewrite(html);
      },
    },
    closeBundle() {
      const file = path.resolve(__dirname, "apk-www/index.html");
      if (!fs.existsSync(file)) return;
      const next = rewrite(fs.readFileSync(file, "utf8"));
      fs.writeFileSync(file, next);
    },
  };
}

export default defineConfig({
  root: path.resolve(__dirname, "apk-src"),
  base: "./",
  plugins: [react(), tailwindcss(), apkClassicHtml()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  publicDir: path.resolve(__dirname, "public"),
  build: {
    outDir: path.resolve(__dirname, "apk-www"),
    emptyOutDir: true,
    assetsDir: "assets",
    sourcemap: false,
    target: "es2018",
    modulePreload: false,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        format: "iife",
        inlineDynamicImports: true,
        entryFileNames: "assets/game.js",
        assetFileNames: "assets/game[extname]",
      },
    },
  },
});
