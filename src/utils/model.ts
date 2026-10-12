import { ChatOpenAI } from "@langchain/openai";

export const model = new ChatOpenAI({
  configuration: {
    baseURL:
      process.env.OLLAMA_BASE_URL ??
      "http://localhost:11434/v1",
  },
  apiKey: process.env.OLLAMA_API_KEY ?? "ollama",
  model: process.env.OLLAMA_MODEL ?? "smollm2:latest",
  temperature: 0,
});