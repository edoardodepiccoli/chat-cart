import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { getToolName, isToolUIPart, readUIMessageStream } from "ai";
import {
  ApiVersion,
  type StorefrontApiContext,
} from "@shopify/shopify-app-react-router/server";

import { runAgent } from "../app/agent/agent.server";
import { generateSuggestions } from "../app/agent/suggestions.server";
import prisma from "../app/db.server";
import type { ChatMessage } from "../shared/chat";
import type { PageContext, Visit } from "../shared/context";
import {
  DATA_TOOLS,
  DISPLAY_TOOLS,
  type DataTool,
  type DisplayTool,
} from "../shared/tools";
import { CONTRACT, type Shown, type Turn } from "./checks";
import { SCENARIOS, type Scenario } from "./scenarios";

const DEFAULT_MARKET = { country: "US", language: "en" };

type Failure = { check: string; reason: string };

type TurnResult = Turn & { failures: Failure[] };

type ScenarioRun = {
  scenario: string;
  run: number;
  passed: boolean;
  turns: TurnResult[];
  error?: string;
};

async function storefrontClient(): Promise<StorefrontApiContext> {
  const session = await prisma.session.findFirst({
    where: { isOnline: false },
  });
  if (!session)
    throw new Error(
      "No offline session in the database: run npm run dev and open the app once.",
    );
  if (session.expires && session.expires < new Date())
    throw new Error(
      `The ${session.shop} session expired: run npm run dev and open the app once to refresh it.`,
    );

  const url = `https://${session.shop}/api/${ApiVersion.July26}/graphql.json`;
  return {
    graphql: async (
      query: string,
      options: { variables?: Record<string, unknown> } = {},
    ) => {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Shopify-Storefront-Private-Token": session.accessToken,
        },
        body: JSON.stringify({ query, variables: options.variables }),
      });
      if (!response.ok)
        throw new Error(
          `Storefront API ${response.status}: ${await response.text()}`,
        );
      return response;
    },
  } as unknown as StorefrontApiContext;
}

async function runTurn(
  history: ChatMessage[],
  user: string,
  storefront: StorefrontApiContext,
  market: { country: string; language: string },
  page: PageContext,
  visits: Visit[],
  teaser: boolean,
): Promise<{ turn: Turn; history: ChatMessage[] }> {
  const userMessage: ChatMessage = {
    id: randomUUID(),
    role: "user",
    parts: [{ type: "text", text: user }],
  };
  const messages = [...history, userMessage];
  const { modelMessages, result } = await runAgent(
    messages,
    storefront,
    { ...market, page, history: visits },
    teaser,
  );

  let reply: ChatMessage | undefined;
  for await (const message of readUIMessageStream<ChatMessage>({
    stream: result.toUIMessageStream<ChatMessage>({ sendReasoning: false }),
    terminateOnError: true,
  }))
    reply = message;

  const steps = (await result.steps).map((step) => ({
    text: step.text.trim(),
    calls: step.toolCalls.map((call) => ({
      name: call.toolName,
      input: call.input,
    })),
  }));
  const suggestions = await generateSuggestions([
    ...modelMessages,
    ...(await result.responseMessages),
  ]);
  const parts = reply?.parts ?? [];
  const shown: Shown[] = parts.flatMap((part) =>
    isToolUIPart(part) &&
    part.state === "output-available" &&
    DISPLAY_TOOLS.includes(getToolName(part) as DisplayTool)
      ? [{ name: getToolName(part), input: part.input, output: part.output }]
      : [],
  );
  const assistant: ChatMessage = {
    id: randomUUID(),
    role: "assistant",
    parts: [...parts, { type: "data-suggestions", data: suggestions }],
  };

  return {
    turn: {
      user,
      steps,
      text: steps
        .map((step) => step.text)
        .filter(Boolean)
        .join(" "),
      lookups: steps
        .flatMap((step) => step.calls)
        .filter((call) => DATA_TOOLS.includes(call.name as DataTool)),
      shown,
      suggestions,
    },
    history: [...messages, assistant],
  };
}

async function runScenario(
  scenario: Scenario,
  run: number,
  storefront: StorefrontApiContext,
): Promise<ScenarioRun> {
  const turns: TurnResult[] = [];
  let history: ChatMessage[] = [];
  try {
    for (const { user, teaser = false, expect = [] } of scenario.turns) {
      const result = await runTurn(
        history,
        user,
        storefront,
        scenario.market ?? DEFAULT_MARKET,
        scenario.page ?? { type: "other" },
        scenario.history ?? [],
        teaser,
      );
      history = result.history;
      const failures = [...CONTRACT, ...expect].flatMap((check) => {
        const reason = check.run(result.turn);
        return reason ? [{ check: check.name, reason }] : [];
      });
      turns.push({ ...result.turn, failures });
    }
  } catch (error) {
    return {
      scenario: scenario.name,
      run,
      passed: false,
      turns,
      error: error instanceof Error ? error.message : String(error),
    };
  }
  return {
    scenario: scenario.name,
    run,
    passed: turns.every((turn) => !turn.failures.length),
    turns,
  };
}

async function pool<T, R>(
  items: T[],
  size: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await task(items[index]);
      }
    }),
  );
  return results;
}

function describeShown(shown: Shown[]): string {
  return (
    shown
      .map(({ name, input }) => {
        const { handle, handles } = (input ?? {}) as {
          handle?: string;
          handles?: string[];
        };
        const products = handles ?? (handle ? [handle] : []);
        return products.length ? `${name} ${products.join(", ")}` : name;
      })
      .join(", ") || "-"
  );
}

function printRun(result: ScenarioRun, verbose: boolean) {
  console.log(
    `${result.passed ? "✓" : "✗"} ${result.scenario} #${result.run}${result.error ? `: ${result.error}` : ""}`,
  );
  if (result.passed && !verbose) return;
  for (const turn of result.turns) {
    console.log(`    > ${turn.user}`);
    console.log(
      `      lookups: ${turn.lookups.map((call) => `${call.name}${JSON.stringify(call.input)}`).join(", ") || "-"}`,
    );
    console.log(`      text: ${turn.text || "-"}`);
    console.log(`      shown: ${describeShown(turn.shown)}`);
    console.log(`      suggestions: ${turn.suggestions.join(" | ")}`);
    for (const failure of turn.failures)
      console.log(`      ✗ ${failure.check}: ${failure.reason}`);
  }
}

function printSummary(results: ScenarioRun[]) {
  const passed = results.filter((result) => result.passed).length;
  console.log(
    `\n${passed}/${results.length} scenario runs passed (${Math.round((passed / results.length) * 100)}%)`,
  );

  const byScenario = new Map<string, ScenarioRun[]>();
  for (const result of results)
    byScenario.set(result.scenario, [
      ...(byScenario.get(result.scenario) ?? []),
      result,
    ]);
  for (const [name, runs] of byScenario) {
    const ok = runs.filter((run) => run.passed).length;
    if (ok < runs.length) console.log(`  ${name}: ${ok}/${runs.length}`);
  }

  const byCheck = new Map<string, number>();
  for (const failure of results.flatMap((result) =>
    result.turns.flatMap((turn) => turn.failures),
  ))
    byCheck.set(failure.check, (byCheck.get(failure.check) ?? 0) + 1);
  if (byCheck.size) {
    console.log("\nFailed checks:");
    for (const [name, count] of [...byCheck].sort((a, b) => b[1] - a[1]))
      console.log(`  ${count}× ${name}`);
  }
}

export async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      runs: { type: "string", default: "1" },
      concurrency: { type: "string", default: "4" },
      verbose: { type: "boolean", default: false },
    },
  });
  const runs = Number(values.runs);
  const scenarios = SCENARIOS.filter(
    (scenario) =>
      !positionals.length ||
      positionals.some(
        (filter) =>
          scenario.name.includes(filter) || scenario.covers.includes(filter),
      ),
  );
  if (!scenarios.length) {
    console.log(`No scenario matches ${positionals.join(", ")}`);
    return 1;
  }

  const storefront = await storefrontClient();
  const jobs = scenarios.flatMap((scenario) =>
    Array.from({ length: runs }, (_, index) => ({ scenario, run: index + 1 })),
  );
  console.log(
    `Running ${scenarios.length} scenarios × ${runs} = ${jobs.length} runs\n`,
  );

  const startedAt = new Date();
  const results = await pool(
    jobs,
    Number(values.concurrency),
    async ({ scenario, run }) => {
      const result = await runScenario(scenario, run, storefront);
      printRun(result, values.verbose);
      return result;
    },
  );
  printSummary(results);

  mkdirSync("evals/results", { recursive: true });
  const file = `evals/results/${startedAt.toISOString().replace(/[:.]/g, "-")}.json`;
  writeFileSync(
    file,
    JSON.stringify({ startedAt, runs, filters: positionals, results }, null, 2),
  );
  console.log(`\nSaved ${file}`);

  await prisma.$disconnect();
  return results.every((result) => result.passed) ? 0 : 1;
}
