import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
import { getToolCallLabel, ToolCallBadge } from "../ToolCallBadge";
import type { ToolInvocation } from "ai";

// --- getToolCallLabel unit tests ---

test("str_replace_editor create returns Creating filename", () => {
  expect(
    getToolCallLabel("str_replace_editor", {
      command: "create",
      path: "/components/Button.tsx",
    })
  ).toBe("Creating Button.tsx");
});

test("str_replace_editor str_replace returns Editing filename", () => {
  expect(
    getToolCallLabel("str_replace_editor", {
      command: "str_replace",
      path: "/components/Button.tsx",
    })
  ).toBe("Editing Button.tsx");
});

test("str_replace_editor insert returns Editing filename", () => {
  expect(
    getToolCallLabel("str_replace_editor", {
      command: "insert",
      path: "/components/Button.tsx",
    })
  ).toBe("Editing Button.tsx");
});

test("str_replace_editor view returns Viewing filename", () => {
  expect(
    getToolCallLabel("str_replace_editor", {
      command: "view",
      path: "/components/Button.tsx",
    })
  ).toBe("Viewing Button.tsx");
});

test("str_replace_editor undo_edit returns Undoing edit in filename", () => {
  expect(
    getToolCallLabel("str_replace_editor", {
      command: "undo_edit",
      path: "/components/Button.tsx",
    })
  ).toBe("Undoing edit in Button.tsx");
});

test("str_replace_editor unknown command returns Editing file", () => {
  expect(
    getToolCallLabel("str_replace_editor", {
      command: "unknown",
      path: "/components/Button.tsx",
    })
  ).toBe("Editing file");
});

test("file_manager rename returns Renaming filename", () => {
  expect(
    getToolCallLabel("file_manager", {
      command: "rename",
      path: "/components/Button.tsx",
    })
  ).toBe("Renaming Button.tsx");
});

test("file_manager delete returns Deleting filename", () => {
  expect(
    getToolCallLabel("file_manager", {
      command: "delete",
      path: "/components/Button.tsx",
    })
  ).toBe("Deleting Button.tsx");
});

test("file_manager unknown command returns Managing file", () => {
  expect(
    getToolCallLabel("file_manager", {
      command: "unknown",
      path: "/components/Button.tsx",
    })
  ).toBe("Managing file");
});

test("missing path returns label without filename", () => {
  expect(
    getToolCallLabel("str_replace_editor", { command: "create" })
  ).toBe("Creating file");
});

test("empty path returns label without filename", () => {
  expect(
    getToolCallLabel("str_replace_editor", { command: "create", path: "" })
  ).toBe("Creating file");
});

test("unknown toolName returns raw toolName", () => {
  expect(getToolCallLabel("some_other_tool", { command: "run" })).toBe(
    "some_other_tool"
  );
});

// --- ToolCallBadge component tests ---

function makeTool(overrides: Partial<ToolInvocation> = {}): ToolInvocation {
  return {
    toolCallId: "test-id",
    toolName: "str_replace_editor",
    args: { command: "create", path: "/components/Button.tsx" },
    state: "call",
    ...overrides,
  } as ToolInvocation;
}

test("ToolCallBadge shows spinner and label when pending", () => {
  render(<ToolCallBadge toolInvocation={makeTool({ state: "call" })} />);
  expect(screen.getByText("Creating Button.tsx")).toBeDefined();
  // Spinner element is present (lucide Loader2 renders an svg)
  const svg = document.querySelector("svg");
  expect(svg).toBeTruthy();
});

test("ToolCallBadge shows green dot and label when result is present", () => {
  render(
    <ToolCallBadge
      toolInvocation={
        makeTool({ state: "result", result: "Success" } as Partial<ToolInvocation>)
      }
    />
  );
  expect(screen.getByText("Creating Button.tsx")).toBeDefined();
  // Green dot div is present (no spinner)
  const dot = document.querySelector(".bg-emerald-500");
  expect(dot).toBeTruthy();
  const spinner = document.querySelector(".animate-spin");
  expect(spinner).toBeNull();
});

test("ToolCallBadge shows spinner when state is result but result is absent", () => {
  render(
    <ToolCallBadge
      toolInvocation={
        makeTool({ state: "result", result: undefined } as Partial<ToolInvocation>)
      }
    />
  );
  const spinner = document.querySelector(".animate-spin");
  expect(spinner).toBeTruthy();
});

test("ToolCallBadge renders friendly label for file_manager delete", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeTool({
        toolName: "file_manager",
        args: { command: "delete", path: "/components/Card.tsx" },
        state: "result",
        result: "Deleted",
      } as Partial<ToolInvocation>)}
    />
  );
  expect(screen.getByText("Deleting Card.tsx")).toBeDefined();
});
