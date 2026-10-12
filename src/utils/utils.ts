export const ui = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  gray: "\x1b[90m",
  red: "\x1b[31m",
};

export function banner(): void {
  console.log();
  console.log(`${ui.cyan}${ui.bold}╭──────────────────────────────────────────╮`);
  console.log("│          TERMINAL AI ASSISTANT           │");
  console.log(`│       Powered by Ollama + LangGraph      │`);
  console.log(`╰──────────────────────────────────────────╯${ui.reset}`);
  console.log(`${ui.gray}Type 'exit' to quit.${ui.reset}`);
}

export function printAssistant(content: unknown): void {
  const message =
    typeof content === "string"
      ? content
      : JSON.stringify(content, null, 2);

  console.log();
  console.log(`${ui.green}${ui.bold}  AI Assistant${ui.reset}`);
  console.log(`${ui.gray}  ────────────────────────────────────────${ui.reset}`);
  console.log(`  ${message || "(No text response)"}`);
  console.log();
}