import compression from "compression";
import express from "express";
import morgan from "morgan";
import { WebSocketServer, WebSocket } from "ws";
import { parseCubeSchemas } from "./app/lib/lsp-utils";
import { handleMessage } from "./app/lib/semantic-sql-lsp";

// Short-circuit the type-checking of the built output.
const BUILD_PATH = "./build/server/index.js";
const DEVELOPMENT = process.env.NODE_ENV === "development";
const PORT = Number.parseInt(process.env.PORT || "3000");

const app = express();

app.use(compression());
app.disable("x-powered-by");

if (DEVELOPMENT) {
  console.log("Starting development server");
  const viteDevServer = await import("vite").then((vite) =>
    vite.createServer({
      server: { middlewareMode: true },
    })
  );
  app.use(viteDevServer.middlewares);
  app.use(async (req, res, next) => {
    try {
      const source = await viteDevServer.ssrLoadModule("./server/app.ts");
      return await source.app(req, res, next);
    } catch (error) {
      if (typeof error === "object" && error instanceof Error) {
        viteDevServer.ssrFixStacktrace(error);
      }
      next(error);
    }
  });
} else {
  console.log("Starting production server");
  app.use(
    "/assets",
    express.static("build/client/assets", { immutable: true, maxAge: "1y" })
  );
  app.use(express.static("build/client", { maxAge: "1h" }));
  // app.use(await import(BUILD_PATH).then((mod) => mod.app));
}

app.use(morgan("tiny"));

const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

const wss = new WebSocketServer({ server });

let serverMeta: any; // Replace with appropriate type if available
const fileContents: Record<string, string> = {};

wss.on("connection", (ws: WebSocket) => {
  console.log("WebSocket connection established");

  ws.on("message", (message) => {
    try {
      const request = JSON.parse(message.toString());

      // Handle schema updates
      if (request.method === "update-schema") {
        const { schemas } = request.params;
        serverMeta = parseCubeSchemas(schemas); // Replace with actual function
        ws.send(JSON.stringify({ status: "schema-updated" }));
        return;
      }

      // Process other messages
      const response = handleMessage(
        message.toString(),
        fileContents,
        serverMeta
      ); // Replace with your logic
      if (response) {
        ws.send(response);
      }
    } catch (error) {
      console.error("Error handling WebSocket message:", error);
      ws.send(JSON.stringify({ error: "Invalid request" }));
    }
  });

  ws.on("close", () => {
    console.log("WebSocket connection closed");
  });
});

console.log("WebSocket server is running on the same port as HTTP server");