import { createServer } from "vite";

const server = await createServer({
  configFile: false,
  appType: "custom",
  logLevel: "error",
  server: { middlewareMode: true, hmr: false },
});
process.env.NODE_ENV = "production";

try {
  const { main } = await server.ssrLoadModule("/evals/run.ts");
  process.exitCode = await main(process.argv.slice(2));
} finally {
  await server.close();
}
