import { describe, expect, it } from "vitest";
import { joinCommitMessage, splitCommitMessage } from "./commitMessage";

describe("splitCommitMessage", () => {
  it("splits subject and body on blank line", () => {
    expect(splitCommitMessage("feat: x\n\nbody line")).toEqual({
      summary: "feat: x",
      description: "body line",
    });
  });

  it("treats single line as summary only", () => {
    expect(splitCommitMessage("fix: typo")).toEqual({
      summary: "fix: typo",
      description: "",
    });
  });

  it("handles CRLF and trailing newline", () => {
    expect(splitCommitMessage("feat: a\r\n\r\ndetails\r\n")).toEqual({
      summary: "feat: a",
      description: "details",
    });
  });

  it("round-trips amend-style messages", () => {
    const original = "fix(fe): avatar fallback\n\n- table view\n- session cache";
    const parts = splitCommitMessage(original);
    expect(joinCommitMessage(parts.summary, parts.description)).toBe(original);
  });
});

describe("joinCommitMessage", () => {
  it("joins with blank line between summary and body", () => {
    expect(joinCommitMessage("feat: x", "details")).toBe("feat: x\n\ndetails");
  });

  it("returns summary only when description empty", () => {
    expect(joinCommitMessage("only", "")).toBe("only");
    expect(joinCommitMessage("only", "   ")).toBe("only");
  });

  it("returns empty when summary empty", () => {
    expect(joinCommitMessage("", "body")).toBe("");
  });
});
