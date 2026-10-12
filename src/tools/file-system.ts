
import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  mkdir,
  readdir,
  readFile,
  realpath,
} from "node:fs/promises";
import { tool } from "@langchain/core/tools";

const WORKSPACE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "sandbox",
);

async function resolveWorkspacePath(relativePath: string): Promise<string> {
  if (
    !relativePath.trim() ||
    path.isAbsolute(relativePath) ||
    relativePath.includes("\0")
  ) {
    throw new Error("Provide a valid relative path inside sandbox.");
  }

  await mkdir(WORKSPACE, { recursive: true });

  const root = await realpath(WORKSPACE);
  const target = path.resolve(root, relativePath);
  const relative = path.relative(root, target);

  if (
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new Error("Access outside the sandbox is not allowed.");
  }

  // Resolve symlinks too, so they cannot bypass the workspace boundary.
  const actualPath = await realpath(target);
  const actualRelative = path.relative(root, actualPath);

  if (
    actualRelative === ".." ||
    actualRelative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(actualRelative)
  ) {
    throw new Error("Access outside the sandbox is not allowed.");
  }

  return actualPath;
}

export const readFileTool = tool(
  async ({ path: filePath }: { path: string }): Promise<string> => {
    try {
      const safePath = await resolveWorkspacePath(filePath);
      const content = await readFile(safePath, "utf8");

      return `Contents of ${filePath}:\n\n${content}`;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : String(error);

      return `Could not read "${filePath}": ${message}`;
    }
  },
  {
    name: "read_file",
    description:
      "Read a UTF-8 text file inside the sandbox workspace. Use this when the user asks to inspect or summarize an existing file.",
    schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Relative file path, e.g. notes/todo.txt",
        },
      },
      required: ["path"],
      additionalProperties: false,
    },
  },
);

export const listFilesTool = tool(
  async ({ path: directoryPath }: { path: string }): Promise<string> => {
    try {
      const safePath = await resolveWorkspacePath(directoryPath);
      const entries = await readdir(safePath, { withFileTypes: true });

      if (entries.length === 0) {
        return `The directory "${directoryPath}" is empty.`;
      }

      const listing = entries
        .map((entry) => `${entry.isDirectory() ? "[DIR] " : "[FILE] "}${entry.name}`)
        .sort((a, b) => a.localeCompare(b))
        .join("\n");

      return `Contents of "${directoryPath}":\n${listing}`;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : String(error);

      return `Could not list "${directoryPath}": ${message}`;
    }
  },
  {
    name: "list_files",
    description:
      "List files and subdirectories directly inside a directory in the sandbox. Use '.' to list the sandbox root.",
    schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: 'Relative directory path, e.g. "." or "notes"',
        },
      },
      required: ["path"],
      additionalProperties: false,
    },
  },
);
