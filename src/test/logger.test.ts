import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("logger", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "debug").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Reset module cache to allow re-importing with different env
    vi.resetModules();
  });

  describe("in development mode", () => {
    it("should log messages when DEV is true", async () => {
      // Mock DEV as true
      vi.stubEnv("DEV", true);

      // Re-import to get fresh module with mocked env
      const { logger } = await import("../utils/logger");

      logger.log("test message");
      expect(console.log).toHaveBeenCalledWith("test message");

      logger.warn("warning message");
      expect(console.warn).toHaveBeenCalledWith("warning message");

      logger.error("error message");
      expect(console.error).toHaveBeenCalledWith("error message");
    });

    it("should support multiple arguments", async () => {
      vi.stubEnv("DEV", true);
      const { logger } = await import("../utils/logger");

      logger.log("message", { data: 123 }, [1, 2, 3]);
      expect(console.log).toHaveBeenCalledWith("message", { data: 123 }, [1, 2, 3]);
    });
  });

  describe("createModuleLogger", () => {
    it("should prefix log messages with module name", async () => {
      vi.stubEnv("DEV", true);
      const { createModuleLogger } = await import("../utils/logger");

      const testLogger = createModuleLogger("TestModule");
      testLogger.log("test message");

      expect(console.log).toHaveBeenCalledWith("[TestModule]", "test message");
    });
  });

  describe("updateLogger", () => {
    it("should be a pre-configured logger with Update prefix", async () => {
      vi.stubEnv("DEV", true);
      const { updateLogger } = await import("../utils/logger");

      updateLogger.log("checking for updates");
      expect(console.log).toHaveBeenCalledWith("[Update]", "checking for updates");
    });
  });
});
