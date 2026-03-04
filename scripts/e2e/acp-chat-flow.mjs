#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const provider = (process.env.ACP_PROVIDER || process.argv[2] || "claude").toLowerCase();
const prompt =
  process.env.ACP_PROMPT ||
  "Reply with exactly one line: ACP_E2E_OK. Do not include any extra explanation.";
const timeoutMs = Number(process.env.ACP_TIMEOUT_MS || "120000");

function nowIso() {
  return new Date().toISOString();
}

function createLogger() {
  const artifactsDir = path.join(process.cwd(), "artifacts", "e2e");
  fs.mkdirSync(artifactsDir, { recursive: true });
  const stamp = nowIso().replaceAll(":", "-").replaceAll(".", "-");
  const logPath = path.join(artifactsDir, `acp-chat-flow-${provider}-${stamp}.log`);
  const stream = fs.createWriteStream(logPath, { flags: "a" });
  return {
    logPath,
    close: () => stream.end(),
    line: (message) => {
      const line = `[${nowIso()}] ${message}`;
      console.log(line);
      stream.write(`${line}\n`);
    },
  };
}

function splitPathLike(value) {
  if (!value) return [];
  return value.split(path.delimiter).filter(Boolean);
}

function resolveCommandPath(cmd) {
  const candidates =
    process.platform === "win32"
      ? [cmd, `${cmd}.exe`, `${cmd}.cmd`, `${cmd}.bat`]
      : [cmd];

  const searchDirs = [
    ...splitPathLike(process.env.PATH),
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
    path.join(os.homedir(), ".local", "bin"),
    path.join(os.homedir(), "Library", "pnpm"),
    path.join(os.homedir(), ".npm-global", "bin"),
  ];

  for (const dir of searchDirs) {
    for (const candidate of candidates) {
      const target = path.join(dir, candidate);
      if (fs.existsSync(target)) {
        return target;
      }
    }
  }
  return null;
}

function getLauncher(targetProvider) {
  if (targetProvider === "claude") {
    const local = resolveCommandPath("claude-agent-acp");
    if (local) return { cmd: local, args: [] };
    const npx = resolveCommandPath("npx");
    if (npx) {
      return {
        cmd: npx,
        args: ["--yes", "--prefer-offline", "@zed-industries/claude-agent-acp"],
      };
    }
    return null;
  }
  if (targetProvider === "codex") {
    const local = resolveCommandPath("codex-acp");
    if (local) return { cmd: local, args: [] };
    const npx = resolveCommandPath("npx");
    if (npx) {
      return {
        cmd: npx,
        args: ["--yes", "--prefer-offline", "@zed-industries/codex-acp"],
      };
    }
    return null;
  }
  if (targetProvider === "opencode") {
    const local = resolveCommandPath("opencode");
    if (local) return { cmd: local, args: ["acp"] };
    return null;
  }
  return null;
}

function parseRpcId(id) {
  if (typeof id === "number" && Number.isFinite(id)) return id;
  if (typeof id === "string" && id.trim() !== "" && Number.isFinite(Number(id))) {
    return Number(id);
  }
  return null;
}

function choosePermissionOption(request) {
  const options = request?.params?.options;
  if (!Array.isArray(options) || options.length === 0) return null;
  const rejectOnce = options.find((opt) => opt?.kind === "reject_once");
  if (rejectOnce?.optionId) return rejectOnce.optionId;
  return options[0]?.optionId ?? null;
}

function extractUpdateText(update) {
  const kind = update?.sessionUpdate ?? update?.kind;
  if (kind !== "agent_message_chunk") return null;

  const content = update?.content;
  if (typeof content?.text === "string" && content.text.length > 0) return content.text;
  if (typeof content === "string" && content.length > 0) return content;

  if (Array.isArray(content?.content)) {
    const merged = content.content
      .filter((item) => item?.type === "text" && typeof item?.text === "string")
      .map((item) => item.text)
      .join("");
    if (merged) return merged;
  }

  const delta = update?.delta;
  if (typeof delta?.text === "string" && delta.text.length > 0) return delta.text;
  if (Array.isArray(delta)) {
    const merged = delta
      .filter((item) => item?.type === "text" && typeof item?.text === "string")
      .map((item) => item.text)
      .join("");
    if (merged) return merged;
  }

  return null;
}

async function main() {
  const logger = createLogger();
  const launcher = getLauncher(provider);
  if (!launcher) {
    logger.line(`ERROR launcher not found for provider=${provider}`);
    logger.line(
      "HINT install adapter: claude-agent-acp / codex-acp / opencode (or ensure npx is available)"
    );
    logger.close();
    process.exit(2);
  }

  logger.line(`launch provider=${provider} cmd=${launcher.cmd} args=${JSON.stringify(launcher.args)}`);
  const child = spawn(launcher.cmd, launcher.args, {
    cwd: process.cwd(),
    stdio: ["pipe", "pipe", "pipe"],
  });

  let nextId = 1;
  const ids = {
    initialize: 1,
    sessionNew: 2,
    prompt: 3,
  };
  let phase = "waiting_initialize";
  let sessionId = "";
  let chunkCount = 0;
  let assistantText = "";
  let finished = false;

  const timeout = setTimeout(() => {
    logger.line(`ERROR timeout after ${timeoutMs}ms`);
    try {
      child.kill("SIGKILL");
    } catch {
      // ignore
    }
    finish(1);
  }, timeoutMs);

  function finish(code) {
    if (finished) return;
    finished = true;
    clearTimeout(timeout);
    logger.line(`summary phase=${phase} sessionId=${sessionId || "<none>"} chunks=${chunkCount}`);
    logger.line(`summary assistantTextPreview=${JSON.stringify(assistantText.slice(0, 200))}`);
    logger.line(`logPath=${logger.logPath}`);
    logger.close();
    process.exit(code);
  }

  function sendRpcRequest(method, params) {
    const id = nextId++;
    const payload = { jsonrpc: "2.0", id, method, params };
    child.stdin.write(`${JSON.stringify(payload)}\n`);
    logger.line(`--> request id=${id} method=${method}`);
    return id;
  }

  function sendRpcResult(id, result) {
    const payload = { jsonrpc: "2.0", id, result };
    child.stdin.write(`${JSON.stringify(payload)}\n`);
    logger.line(`<-- response id=${JSON.stringify(id)} result=${JSON.stringify(result)}`);
  }

  child.on("error", (error) => {
    logger.line(`ERROR spawn failure: ${String(error)}`);
    finish(1);
  });

  child.on("exit", (code, signal) => {
    logger.line(`process exit code=${String(code)} signal=${String(signal)}`);
    if (!finished && chunkCount === 0) {
      finish(1);
    }
  });

  let stdoutBuf = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdoutBuf += chunk;
    while (true) {
      const lineBreak = stdoutBuf.indexOf("\n");
      if (lineBreak < 0) break;
      const line = stdoutBuf.slice(0, lineBreak).trim();
      stdoutBuf = stdoutBuf.slice(lineBreak + 1);
      if (!line) continue;
      logger.line(`<-- stdout ${line}`);

      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        continue;
      }

      const method = msg?.method;
      if (typeof method === "string") {
        if (method === "session/update") {
          const update = msg?.params?.update;
          const text = extractUpdateText(update);
          if (typeof text === "string") {
            chunkCount += 1;
            assistantText += text;
            logger.line(`chunk#${chunkCount} len=${text.length}`);
          }
          continue;
        }

        if (msg?.id !== undefined && method === "session/request_permission") {
          const optionId = choosePermissionOption(msg);
          if (optionId) {
            sendRpcResult(msg.id, { outcome: { outcome: "selected", optionId } });
          } else {
            sendRpcResult(msg.id, { outcome: { outcome: "cancelled" } });
          }
          continue;
        }
      }

      const id = parseRpcId(msg?.id);
      if (id == null) continue;

      if (msg?.error) {
        logger.line(`ERROR rpc id=${id} ${JSON.stringify(msg.error)}`);
        try {
          child.kill("SIGKILL");
        } catch {
          // ignore
        }
        finish(1);
        return;
      }

      if (id === ids.initialize && phase === "waiting_initialize") {
        phase = "waiting_session_new";
        sendRpcRequest("session/new", { cwd: process.cwd(), mcpServers: [] });
        continue;
      }

      if (id === ids.sessionNew && phase === "waiting_session_new") {
        sessionId = msg?.result?.sessionId ?? "";
        if (!sessionId) {
          logger.line("ERROR empty sessionId from session/new");
          try {
            child.kill("SIGKILL");
          } catch {
            // ignore
          }
          finish(1);
          return;
        }
        phase = "waiting_prompt_result";
        sendRpcRequest("session/prompt", {
          sessionId,
          prompt: [{ type: "text", text: prompt }],
        });
        continue;
      }

      if (id === ids.prompt && phase === "waiting_prompt_result") {
        const stopReason = msg?.result?.stopReason ?? "unknown";
        logger.line(`prompt_result stopReason=${stopReason}`);
        try {
          child.kill("SIGKILL");
        } catch {
          // ignore
        }
        if (chunkCount <= 0) {
          logger.line("ERROR prompt finished without chunks");
          finish(1);
          return;
        }
        finish(0);
      }
    }
  });

  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    for (const line of chunk.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      logger.line(`<-- stderr ${trimmed}`);
    }
  });

  sendRpcRequest("initialize", { protocolVersion: 1, clientCapabilities: {} });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

