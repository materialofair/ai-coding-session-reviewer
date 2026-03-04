#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

if (process.platform !== "darwin") {
  console.error("This script only supports macOS.");
  process.exit(2);
}

const ROOT = process.cwd();
const ARTIFACT_DIR = path.join(ROOT, "artifacts", "e2e");
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const logPath = path.join(ARTIFACT_DIR, `macos-native-ui-acp-${stamp}.log`);
const screenshotPath = path.join(ARTIFACT_DIR, `macos-native-ui-acp-${stamp}.png`);
const logStream = fs.createWriteStream(logPath, { flags: "a" });

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  logStream.write(`${line}\n`);
}

function safeClose() {
  try {
    logStream.end();
  } catch {
    // ignore
  }
}

function runAppleScript(script, args = []) {
  return spawnSync("osascript", ["-", ...args], {
    input: script,
    encoding: "utf8",
  });
}

function detectAppProcessName() {
  const script = `
on run
  tell application "System Events"
    if exists process "AI Coding Session Reviewer" then return "AI Coding Session Reviewer"
    if exists process "ai-coding-session-reviewer" then return "ai-coding-session-reviewer"
    set matches to name of every process whose name contains "Coding Session Reviewer"
    if (count of matches) > 0 then return item 1 of matches
    return ""
  end tell
end run
`;
  const out = runAppleScript(script);
  if (out.status !== 0) return "";
  return (out.stdout || "").trim();
}

function sendMessageByNativeUI(processName, message, openPanelToggle) {
  const script = `
on run argv
  set procName to item 1 of argv
  set msgText to item 2 of argv
  set togglePanel to item 3 of argv

  try
    tell application id "com.claude.history-viewer" to activate
  end try
  delay 0.3

  tell application "System Events"
    if not (exists process procName) then error "Process not found: " & procName
    tell process procName
      set frontmost to true
      if (count of windows) is 0 then error "No visible windows found for process: " & procName
      set win to first window
      set {wx, wy} to position of win
      set {ww, wh} to size of win

      if togglePanel is "1" then
        set toggleX to wx + ww - 18
        set toggleY to wy + 40
        click at {toggleX, toggleY}
        delay 0.5
      end if

      set inputX to wx + ww - 230
      set inputY to wy + wh - 72
      click at {inputX, inputY}
      delay 0.2

      keystroke msgText
      delay 0.2

      set sendX to wx + ww - 36
      set sendY to wy + wh - 72
      click at {sendX, sendY}
    end tell
  end tell

  return "ok"
end run
`;
  return runAppleScript(script, [processName, message, openPanelToggle ? "1" : "0"]);
}

function takeScreenshot(filePath) {
  const res = spawnSync("screencapture", ["-x", filePath], { encoding: "utf8" });
  return res.status === 0;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(condition, timeoutMs, intervalMs = 300) {
  const start = Date.now();
  while (Date.now() - start <= timeoutMs) {
    if (condition()) return true;
    await wait(intervalMs);
  }
  return false;
}

function hasLine(lines, regex, fromIndex = 0) {
  for (let i = fromIndex; i < lines.length; i += 1) {
    if (regex.test(lines[i])) return true;
  }
  return false;
}

async function main() {
  const marker = `MAC_UI_E2E_${Date.now()}`;
  log(`marker=${marker}`);

  // Try to quit stale app instances to reduce interference.
  spawnSync("pkill", ["-f", "ai-coding-session-reviewer"], { encoding: "utf8" });
  await wait(1000);

  log("starting tauri dev...");
  const child = spawn("pnpm", ["tauri:dev"], {
    cwd: ROOT,
    env: { ...process.env },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let done = false;
  const lines = [];
  let stdoutBuf = "";
  let stderrBuf = "";

  function onChunk(kind, chunk) {
    const text = chunk.toString("utf8");
    const bufferRef = kind === "stdout" ? "stdout" : "stderr";
    if (bufferRef === "stdout") {
      stdoutBuf += text;
      while (true) {
        const idx = stdoutBuf.indexOf("\n");
        if (idx < 0) break;
        const line = stdoutBuf.slice(0, idx).trimEnd();
        stdoutBuf = stdoutBuf.slice(idx + 1);
        if (!line) continue;
        const tagged = `[${kind}] ${line}`;
        lines.push(tagged);
        log(tagged);
      }
    } else {
      stderrBuf += text;
      while (true) {
        const idx = stderrBuf.indexOf("\n");
        if (idx < 0) break;
        const line = stderrBuf.slice(0, idx).trimEnd();
        stderrBuf = stderrBuf.slice(idx + 1);
        if (!line) continue;
        const tagged = `[${kind}] ${line}`;
        lines.push(tagged);
        log(tagged);
      }
    }
  }

  child.stdout.on("data", (chunk) => onChunk("stdout", chunk));
  child.stderr.on("data", (chunk) => onChunk("stderr", chunk));

  child.on("error", (err) => {
    log(`tauri dev spawn error: ${String(err)}`);
  });

  const cleanup = () => {
    if (done) return;
    done = true;
    try {
      child.kill("SIGINT");
    } catch {
      // ignore
    }
    spawnSync("pkill", ["-f", "ai-coding-session-reviewer"], { encoding: "utf8" });
    safeClose();
  };

  try {
    const appReady = await waitFor(() => detectAppProcessName() !== "", 180000, 500);
    if (!appReady) {
      log("FAIL: app process not detected within 180s");
      cleanup();
      process.exit(1);
    }

    const processName = detectAppProcessName();
    log(`detected app process: ${processName}`);

    let sendStartIndex = lines.length;
    let sendResult = sendMessageByNativeUI(processName, marker, false);
    log(`first send status=${sendResult.status} stdout=${(sendResult.stdout || "").trim()} stderr=${(sendResult.stderr || "").trim()}`);

    let chatTriggered = await waitFor(
      () => hasLine(lines, /chat_with_ai:start/, sendStartIndex),
      15000,
      300
    );

    if (!chatTriggered) {
      log("first click did not trigger chat_with_ai:start; retry with panel toggle");
      sendStartIndex = lines.length;
      sendResult = sendMessageByNativeUI(processName, marker, true);
      log(`second send status=${sendResult.status} stdout=${(sendResult.stdout || "").trim()} stderr=${(sendResult.stderr || "").trim()}`);
      chatTriggered = await waitFor(
        () => hasLine(lines, /chat_with_ai:start/, sendStartIndex),
        20000,
        300
      );
    }

    if (!chatTriggered) {
      log("FAIL: native UI send did not trigger backend chat_with_ai");
      takeScreenshot(screenshotPath);
      log(`screenshot=${screenshotPath}`);
      cleanup();
      process.exit(1);
    }

    log("chat_with_ai triggered, waiting ACP chunk/done...");

    const chunkOk = await waitFor(
      () => hasLine(lines, /stream_acp_output:chunk/),
      180000,
      500
    );
    const doneOk = await waitFor(
      () => hasLine(lines, /stream_acp_output:prompt_done/),
      180000,
      500
    );
    const hasError = hasLine(lines, /ai_stream_error|stream_acp_output:rpc_error|prompt_done_zero_chunks/);

    takeScreenshot(screenshotPath);
    log(`screenshot=${screenshotPath}`);

    if (!chunkOk || !doneOk || hasError) {
      log(`FAIL: verification failed chunkOk=${chunkOk} doneOk=${doneOk} hasError=${hasError}`);
      cleanup();
      process.exit(1);
    }

    log("PASS: macOS native UI automation triggered ACP streaming successfully.");
    cleanup();
    process.exit(0);
  } catch (error) {
    log(`FAIL: unexpected error ${String(error)}`);
    cleanup();
    process.exit(1);
  }
}

main();
