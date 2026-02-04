import { describe, it, expect } from "vitest";
import { getEnvironmentColor } from "./environment-colors";

describe("getEnvironmentColor", () => {
  describe("basic color retrieval", () => {
    it("returns color object for index 0", () => {
      const color = getEnvironmentColor(0);

      expect(color).toHaveProperty("bg");
      expect(color).toHaveProperty("text");
      expect(color).toHaveProperty("border");
    });

    it("returns emerald colors for index 0", () => {
      const color = getEnvironmentColor(0);

      expect(color.bg).toContain("bg-emerald");
      expect(color.text).toContain("text-emerald");
      expect(color.border).toContain("border-emerald");
    });

    it("returns blue colors for index 1", () => {
      const color = getEnvironmentColor(1);

      expect(color.bg).toContain("bg-blue");
      expect(color.text).toContain("text-blue");
      expect(color.border).toContain("border-blue");
    });

    it("returns purple colors for index 2", () => {
      const color = getEnvironmentColor(2);

      expect(color.bg).toContain("bg-purple");
      expect(color.text).toContain("text-purple");
      expect(color.border).toContain("border-purple");
    });

    it("returns orange colors for index 3", () => {
      const color = getEnvironmentColor(3);

      expect(color.bg).toContain("bg-orange");
      expect(color.text).toContain("text-orange");
      expect(color.border).toContain("border-orange");
    });

    it("returns pink colors for index 4", () => {
      const color = getEnvironmentColor(4);

      expect(color.bg).toContain("bg-pink");
      expect(color.text).toContain("text-pink");
      expect(color.border).toContain("border-pink");
    });

    it("returns yellow colors for index 5", () => {
      const color = getEnvironmentColor(5);

      expect(color.bg).toContain("bg-yellow");
      expect(color.text).toContain("text-yellow");
      expect(color.border).toContain("border-yellow");
    });

    it("returns red colors for index 6", () => {
      const color = getEnvironmentColor(6);

      expect(color.bg).toContain("bg-red");
      expect(color.text).toContain("text-red");
      expect(color.border).toContain("border-red");
    });

    it("returns indigo colors for index 7", () => {
      const color = getEnvironmentColor(7);

      expect(color.bg).toContain("bg-indigo");
      expect(color.text).toContain("text-indigo");
      expect(color.border).toContain("border-indigo");
    });
  });

  describe("color cycling", () => {
    it("wraps around to first color after 8 environments", () => {
      const color0 = getEnvironmentColor(0);
      const color8 = getEnvironmentColor(8);

      expect(color0.bg).toBe(color8.bg);
      expect(color0.text).toBe(color8.text);
      expect(color0.border).toBe(color8.border);
    });

    it("maintains correct cycling for larger indices", () => {
      const color1 = getEnvironmentColor(1);
      const color9 = getEnvironmentColor(9);
      const color17 = getEnvironmentColor(17);

      expect(color1.bg).toBe(color9.bg);
      expect(color1.bg).toBe(color17.bg);
    });

    it("correctly cycles all 8 colors", () => {
      const colors = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => getEnvironmentColor(i));
      const cycledColors = [8, 9, 10, 11, 12, 13, 14, 15].map((i) =>
        getEnvironmentColor(i)
      );

      colors.forEach((color, i) => {
        expect(color.bg).toBe(cycledColors[i].bg);
        expect(color.text).toBe(cycledColors[i].text);
        expect(color.border).toBe(cycledColors[i].border);
      });
    });
  });

  describe("dark mode support", () => {
    it("includes dark mode classes in bg", () => {
      const color = getEnvironmentColor(0);
      expect(color.bg).toContain("dark:");
    });

    it("includes dark mode classes in text", () => {
      const color = getEnvironmentColor(0);
      expect(color.text).toContain("dark:");
    });

    it("includes dark mode classes in border", () => {
      const color = getEnvironmentColor(0);
      expect(color.border).toContain("dark:");
    });

    it("combines light and dark classes correctly", () => {
      const color = getEnvironmentColor(0);

      // Check that both light and dark emerald classes are present
      expect(color.bg).toContain("bg-emerald-100");
      expect(color.bg).toContain("dark:bg-emerald-900/20");
      expect(color.text).toContain("text-emerald-800");
      expect(color.text).toContain("dark:text-emerald-300");
      expect(color.border).toContain("border-emerald-200");
      expect(color.border).toContain("dark:border-emerald-800");
    });
  });

  describe("edge cases", () => {
    it("handles very large indices", () => {
      const color = getEnvironmentColor(1000);
      expect(color).toHaveProperty("bg");
      expect(color).toHaveProperty("text");
      expect(color).toHaveProperty("border");
    });

    it("returns consistent colors for same index", () => {
      const color1 = getEnvironmentColor(3);
      const color2 = getEnvironmentColor(3);

      expect(color1.bg).toBe(color2.bg);
      expect(color1.text).toBe(color2.text);
      expect(color1.border).toBe(color2.border);
    });
  });
});
