import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cn, debounce } from "./utils";

describe("cn", () => {
  describe("basic class merging", () => {
    it("merges single class", () => {
      expect(cn("foo")).toBe("foo");
    });

    it("merges multiple classes", () => {
      expect(cn("foo", "bar")).toBe("foo bar");
    });

    it("handles empty string", () => {
      expect(cn("")).toBe("");
    });

    it("handles multiple empty strings", () => {
      expect(cn("", "")).toBe("");
    });

    it("filters out falsy values", () => {
      expect(cn("foo", null, "bar", undefined)).toBe("foo bar");
    });

    it("handles conditional classes", () => {
      const isActive = true;
      const isDisabled = false;
      expect(cn("btn", isActive && "active", isDisabled && "disabled")).toBe(
        "btn active"
      );
    });
  });

  describe("tailwind class merging", () => {
    it("merges conflicting padding classes", () => {
      expect(cn("p-4", "p-2")).toBe("p-2");
    });

    it("merges conflicting margin classes", () => {
      expect(cn("m-2", "m-4")).toBe("m-4");
    });

    it("merges conflicting text color classes", () => {
      expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
    });

    it("merges conflicting background classes", () => {
      expect(cn("bg-red-100", "bg-blue-100")).toBe("bg-blue-100");
    });

    it("keeps non-conflicting classes", () => {
      expect(cn("p-4", "m-2", "text-sm")).toBe("p-4 m-2 text-sm");
    });

    it("handles responsive variants", () => {
      expect(cn("md:p-4", "md:p-2")).toBe("md:p-2");
    });

    it("handles pseudo-class variants", () => {
      expect(cn("hover:bg-red-500", "hover:bg-blue-500")).toBe(
        "hover:bg-blue-500"
      );
    });
  });

  describe("object syntax", () => {
    it("handles object with boolean values", () => {
      expect(cn({ foo: true, bar: false, baz: true })).toBe("foo baz");
    });

    it("handles mixed string and object", () => {
      expect(cn("base", { active: true, disabled: false })).toBe("base active");
    });
  });

  describe("array syntax", () => {
    it("handles array of classes", () => {
      expect(cn(["foo", "bar"])).toBe("foo bar");
    });

    it("handles nested arrays", () => {
      expect(cn(["foo", ["bar", "baz"]])).toBe("foo bar baz");
    });
  });
});

describe("debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("basic functionality", () => {
    it("delays function execution", () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("executes only once for multiple rapid calls", () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("resets timer on subsequent calls", () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      vi.advanceTimersByTime(50);

      debouncedFn();
      vi.advanceTimersByTime(50);

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe("argument passing", () => {
    it("passes arguments to the debounced function", () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn("arg1", "arg2");
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledWith("arg1", "arg2");
    });

    it("uses the last call's arguments when called multiple times", () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn("first");
      debouncedFn("second");
      debouncedFn("third");

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledWith("third");
    });
  });

  describe("timing variations", () => {
    it("works with zero delay", () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 0);

      debouncedFn();
      vi.advanceTimersByTime(0);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("works with long delay", () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 5000);

      debouncedFn();
      vi.advanceTimersByTime(4999);
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe("multiple debounced functions", () => {
    it("handles multiple independent debounced functions", () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();
      const debouncedFn1 = debounce(fn1, 100);
      const debouncedFn2 = debounce(fn2, 200);

      debouncedFn1();
      debouncedFn2();

      vi.advanceTimersByTime(100);
      expect(fn1).toHaveBeenCalledTimes(1);
      expect(fn2).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(fn2).toHaveBeenCalledTimes(1);
    });
  });
});
