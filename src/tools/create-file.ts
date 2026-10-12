
import { tool } from "@langchain/core/tools";
import { mkdir, open } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const WORKSPACE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "sandbox",
);

type CreateFileInput = {
  filename: string;
  content: string;
};

export function isCreateFileInput(value: unknown): value is CreateFileInput {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const input = value as Record<string, unknown>;

  return (
    typeof input.filename === "string" &&
    input.filename.trim().length > 0 &&
    typeof input.content === "string"
  );
}

export async function createFile(input: unknown): Promise<string> {
  if (!isCreateFileInput(input)) {
    return "Error: filename and content must be strings.";
  }

  const filename = input.filename.trim();
  const filePath = path.resolve(WORKSPACE, filename);
  const relativePath = path.relative(WORKSPACE, filePath);

  if (
    filename.length === 0 ||
    relativePath === "" ||
    relativePath.startsWith("..") ||
    path.isAbsolute(relativePath)
  ) {
    return "Error: File path must be inside the workspace.";
  }

  await mkdir(path.dirname(filePath), { recursive: true });

  // "wx" creates a new file and fails if it already exists.
  const handle = await open(filePath, "wx");

  try {
    await handle.writeFile(input.content, "utf8");
  } finally {
    await handle.close();
  }

  return `Successfully created ${relativePath}`;
}

export const createFileTool = tool(
  async (input: CreateFileInput) => createFile(input),
  {
    name: "create_file",
    description:
      "Create a new text file inside the workspace. " +
      "Requires filename (a relative path) and content. " +
      "Does not overwrite existing files.",
    schema: {
      type: "object",
      properties: {
        filename: {
          type: "string",
          description: "Relative path, such as notes/hello.txt",
        },
        content: {
          type: "string",
          description: "Exact text to write into the file",
        },
      },
      required: ["filename", "content"],
      additionalProperties: false,
    },
  }
);
