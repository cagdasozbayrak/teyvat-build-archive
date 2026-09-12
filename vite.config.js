import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite does not serve the Vercel api/ directory, so mount the deployed handler in dev.
// Without this, importing from Enka would 404 outside a deployment and `npm run dev` would
// stop being enough to run the app.
function enkaDevApi() {
  return {
    name: "enka-dev-api",
    configureServer(server) {
      server.middlewares.use("/api/enka", async (req, res) => {
        const { default: handler } = await server.ssrLoadModule("/api/enka.js");
        // middlewares.use strips the mount path, so req.url is "/?uid=...".
        const url = new URL(req.url, "http://localhost");
        await handler(
          { query: Object.fromEntries(url.searchParams) },
          {
            status(code) {
              res.statusCode = code;
              return this;
            },
            setHeader(key, value) {
              res.setHeader(key, value);
              return this;
            },
            json(body) {
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(body));
            },
          }
        );
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), enkaDevApi()],
});
