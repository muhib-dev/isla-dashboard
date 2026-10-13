import { describe, expect, it } from "vitest";
import { csvCell } from "./csv";

describe("csvCell", () => {
  it.each([
    ["plain", "plain"],
    [42, "42"],
    [null, ""],
    [undefined, ""],
    ["a,b", '"a,b"'],
    ['say "hi"', '"say ""hi"""'],
    ["line\nbreak", '"line\nbreak"'],
    ["-12.5", "-12.5"], // real negative numbers stay numbers
    ["=SUM(A1:A9)", "'=SUM(A1:A9)"], // formula injection neutralised
    ["+1 555", "'+1 555"],
    ["@cmd", "'@cmd"],
    ["-cmd|' /C calc'", "'-cmd|' /C calc'"],
  ])("%j → %j", (input, out) => expect(csvCell(input)).toBe(out));
});
