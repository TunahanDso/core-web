import { getSandbox, type Sandbox } from "@cloudflare/sandbox";

export { Sandbox } from "@cloudflare/sandbox";

type Env = {
  Sandbox: DurableObjectNamespace<Sandbox>;
  RUNNER_TOKEN: string;
};

type RunRequest = {
  sessionId?: string;
  language?: string;
  code?: string;
};

const languageConfig: Record<string,{file:string;command:string}> = {
  python: { file: "main.py", command: "python3 /workspace/main.py" },
  javascript: { file: "main.js", command: "node /workspace/main.js" },
  typescript: { file: "main.ts", command: "tsx /workspace/main.ts" },
  c: { file: "main.c", command: "gcc /workspace/main.c -O2 -Wall -Wextra -o /workspace/core-app && /workspace/core-app" },
  cpp: { file: "main.cpp", command: "g++ /workspace/main.cpp -std=c++20 -O2 -Wall -Wextra -o /workspace/core-app && /workspace/core-app" },
};

function authorized(request: Request, env: Env) {
  if (!env.RUNNER_TOKEN) return false;
  const auth = request.headers.get("authorization") || "";
  return auth === "Bearer " + env.RUNNER_TOKEN;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (!authorized(request,env)) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    if (request.method !== "POST") {
      return Response.json({ error: "POST required" }, { status: 405 });
    }

    const url = new URL(request.url);
    if (url.pathname !== "/run") {
      return Response.json({ error: "not found" }, { status: 404 });
    }

    const body = await request.json<RunRequest>();
    const language = String(body.language || "").toLowerCase();
    const config = languageConfig[language];
    if (!config) {
      return Response.json({ error: "unsupported language" }, { status: 400 });
    }

    const code = String(body.code || "");
    if (!code || code.length > 100_000) {
      return Response.json({ error: "code must be between 1 and 100000 characters" }, { status: 400 });
    }

    const requestedId = String(body.sessionId || crypto.randomUUID());
    const sessionId = requestedId.replace(/[^a-zA-Z0-9_-]/g,"").slice(0,80) || crypto.randomUUID();
    const sandbox = getSandbox(env.Sandbox,"core-" + sessionId);

    try {
      await sandbox.writeFile("/workspace/" + config.file,code);
      const started = Date.now();
      const result = await sandbox.exec(config.command,{ timeout: 15_000 });
      return Response.json({
        success: result.success,
        stdout: result.stdout.slice(0,100_000),
        stderr: result.stderr.slice(0,100_000),
        exitCode: result.exitCode,
        durationMs: Date.now() - started,
      });
    } catch (error) {
      return Response.json({
        success: false,
        stdout: "",
        stderr: error instanceof Error ? error.message : "sandbox execution failed",
        exitCode: null,
      }, { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;
