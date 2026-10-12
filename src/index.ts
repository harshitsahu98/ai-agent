
import "dotenv/config";
import { HumanMessage } from "@langchain/core/messages";
import {
  StateGraph,
  MessagesAnnotation,
  START,
} from "@langchain/langgraph";
import {
  ToolNode,
  toolsCondition,
} from "@langchain/langgraph/prebuilt";
import * as readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import type { BaseMessage } from "@langchain/core/messages";
import { createFileTool } from "./tools/create-file.js";
import {
  prepareEmailTool,
  getPendingEmail,
} from "./tools/send-email.js";
import { model } from "./utils/model.js";
import { ui, banner, printAssistant } from "./utils/utils.js";
import { sendFinalEmail } from "./utils/confirm-email.js";
import {
  readFileTool,
  listFilesTool,
} from "./tools/file-system.js";

const tools = [createFileTool,prepareEmailTool,readFileTool,listFilesTool];
const modelWithTools = model.bindTools(tools);

const graph = new StateGraph(MessagesAnnotation)
  .addNode("agent", async (state) => {
    const response = await modelWithTools.invoke(state.messages);
    return { messages: [response] };
  })
  .addNode("tools", new ToolNode(tools))
  .addEdge(START, "agent")
  .addConditionalEdges("agent", toolsCondition)
  .addEdge("tools", "agent")
  .compile();

async function main(): Promise<void> {
  // Create exactly one terminal input interface.
  const rl = readline.createInterface({
    input: stdin,
    output: stdout,
    terminal: true,
  });

  let messages: BaseMessage[] = [];

  banner();

  try {
    while (true) {
      const input = (
        await rl.question(`${ui.cyan}${ui.bold}You ❯ ${ui.reset}`)
      ).trim();

      if (input.toLowerCase() === "exit") {
        console.log(`\n${ui.gray}Goodbye! See you next time.${ui.reset}\n`);
        break;
      }

      if (!input) {continue;}
      
      try {
        console.log(`\n${ui.yellow}⏳ Agent is thinking...${ui.reset}`);

        const result = await graph.invoke(
          {
            messages: [...messages, new HumanMessage(input)],
          },
          {
            recursionLimit: 10,
          },
        );

        messages = result.messages as BaseMessage[];

        // Display only the newest message, not the entire conversation.
        const lastMessage = messages[messages.length - 1];

        // Clear the thinking line before printing the answer.
        stdout.write("\x1b[1A\x1b[2K");

        printAssistant(lastMessage?.content);

        const draft = getPendingEmail();

        if (draft)
            await sendFinalEmail(draft, rl);

      } catch (error: unknown) {
        stdout.write("\x1b[1A\x1b[2K");
        const details =
          error instanceof Error ? error.message : String(error);

        console.log(`${ui.red}  Error: ${details}${ui.reset}\n`);
      }
    }
  } finally {
    rl.close();
  }
}

// Make sure this is the only main() invocation in the file.
main().catch((error: unknown) => {
  console.error(`${ui.red}Fatal error:${ui.reset}`, error);
  process.exitCode = 1;
});