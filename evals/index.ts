import { createServer } from "vite";

process.env.LOG_LEVEL ??= "warn";
process.env.LOG_FORMAT ??= "pretty";

const server = await createServer({
  configFile: false,
  appType: "custom",
  logLevel: "error",
  server: { middlewareMode: true, hmr: false },
});
process.env.NODE_ENV = "production";

const teasers = process.argv[2] === "teasers";
const args = process.argv.slice(teasers ? 3 : 2);

try {
  const { main } = await server.ssrLoadModule(
    teasers ? "/evals/teasers.ts" : "/evals/run.ts",
  );
  process.exitCode = await main(args);
} finally {
  await server.close();
}
