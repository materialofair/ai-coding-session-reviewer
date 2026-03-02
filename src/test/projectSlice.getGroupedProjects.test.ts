/**
 * @fileoverview Tests for projectSlice getGroupedProjects selector
 * Tests for worktree grouping functionality in the store (Git-based only)
 */
import { describe, it, expect } from "vitest";
import type { ClaudeProject } from "../types";
import { detectWorktreeGroupsHybrid } from "../utils/worktreeUtils";

// The store's getGroupedProjects uses Git-based grouping only.
// Projects without git_info are treated as ungrouped.

// Helper to create mock ClaudeProject
function createMockProject(overrides: Partial<ClaudeProject> = {}): ClaudeProject {
  const path = overrides.path ?? "/Users/test/test-project";
  return {
    name: overrides.name ?? "test-project",
    path,
    actual_path: overrides.actual_path ?? path,
    session_count: overrides.session_count ?? 1,
    message_count: overrides.message_count ?? 10,
    last_modified: overrides.last_modified ?? new Date().toISOString(),
    git_info: overrides.git_info ?? null,
  };
}

describe("getGroupedProjects logic", () => {
  describe("when worktreeGrouping is disabled", () => {
    it("should return all projects as ungrouped", () => {
      const projects = [
        createMockProject({ name: "project-a", path: "/Users/jack/project-a" }),
        createMockProject({ name: "project-b", path: "/tmp/branch/project-b" }),
      ];

      // Simulate disabled grouping - return all as ungrouped
      const result = { groups: [], ungrouped: projects };

      expect(result.groups).toHaveLength(0);
      expect(result.ungrouped).toHaveLength(2);
    });
  });

  describe("when worktreeGrouping is enabled (Git-based)", () => {
    it("should group linked worktrees with main repos using git_info", () => {
      const mainRepo = createMockProject({
        name: "my-app",
        path: "/Users/jack/my-app",
        actual_path: "/Users/jack/my-app",
        git_info: { worktree_type: "main" },
      });
      const worktree1 = createMockProject({
        name: "my-app",
        path: "/tmp/feature-branch/my-app",
        actual_path: "/tmp/feature-branch/my-app",
        git_info: {
          worktree_type: "linked",
          main_project_path: "/Users/jack/my-app",
        },
      });
      const worktree2 = createMockProject({
        name: "my-app",
        path: "/private/tmp/hotfix/my-app",
        actual_path: "/private/tmp/hotfix/my-app",
        git_info: {
          worktree_type: "linked",
          main_project_path: "/Users/jack/my-app",
        },
      });
      const standalone = createMockProject({
        name: "standalone",
        path: "/Users/jack/standalone",
        git_info: { worktree_type: "main" },
      });

      const result = detectWorktreeGroupsHybrid([mainRepo, worktree1, worktree2, standalone]);

      // Should have 1 group (my-app with 2 worktrees)
      expect(result.groups).toHaveLength(1);
      expect(result.groups[0].parent.path).toBe("/Users/jack/my-app");
      expect(result.groups[0].children).toHaveLength(2);

      // standalone should be ungrouped
      expect(result.ungrouped).toHaveLength(1);
      expect(result.ungrouped[0].path).toBe("/Users/jack/standalone");
    });

    it("should handle empty projects array", () => {
      const result = detectWorktreeGroupsHybrid([]);

      expect(result.groups).toHaveLength(0);
      expect(result.ungrouped).toHaveLength(0);
    });

    it("should treat projects without git_info as ungrouped", () => {
      const projects = [
        createMockProject({ name: "project-a", path: "/Users/jack/project-a" }),
        createMockProject({ name: "project-a", path: "/tmp/branch/project-a" }),
      ];

      const result = detectWorktreeGroupsHybrid(projects);

      // No git_info means no grouping
      expect(result.groups).toHaveLength(0);
      expect(result.ungrouped).toHaveLength(2);
    });

    it("should handle orphan linked worktrees without main repo", () => {
      const orphanWorktree = createMockProject({
        name: "orphan-project",
        path: "/tmp/branch/orphan-project",
        git_info: {
          worktree_type: "linked",
          main_project_path: "/Users/jack/non-existent",
        },
      });

      const result = detectWorktreeGroupsHybrid([orphanWorktree]);

      expect(result.groups).toHaveLength(0);
      expect(result.ungrouped).toHaveLength(1);
    });

    it("should correctly identify multiple parent-child relationships", () => {
      const projects = [
        // Parent 1 with 1 worktree
        createMockProject({
          name: "app-one",
          path: "/Users/jack/app-one",
          actual_path: "/Users/jack/app-one",
          git_info: { worktree_type: "main" },
        }),
        createMockProject({
          name: "app-one",
          path: "/tmp/feature/app-one",
          git_info: {
            worktree_type: "linked",
            main_project_path: "/Users/jack/app-one",
          },
        }),
        // Parent 2 with 2 worktrees
        createMockProject({
          name: "app-two",
          path: "/Users/jack/app-two",
          actual_path: "/Users/jack/app-two",
          git_info: { worktree_type: "main" },
        }),
        createMockProject({
          name: "app-two",
          path: "/tmp/branch-a/app-two",
          git_info: {
            worktree_type: "linked",
            main_project_path: "/Users/jack/app-two",
          },
        }),
        createMockProject({
          name: "app-two",
          path: "/tmp/branch-b/app-two",
          git_info: {
            worktree_type: "linked",
            main_project_path: "/Users/jack/app-two",
          },
        }),
        // Standalone project
        createMockProject({
          name: "standalone",
          path: "/Users/jack/standalone",
          git_info: { worktree_type: "main" },
        }),
      ];

      const result = detectWorktreeGroupsHybrid(projects);

      expect(result.groups).toHaveLength(2);

      // Find app-one group
      const appOneGroup = result.groups.find((g) => g.parent.name === "app-one");
      expect(appOneGroup).toBeDefined();
      expect(appOneGroup?.children).toHaveLength(1);

      // Find app-two group
      const appTwoGroup = result.groups.find((g) => g.parent.name === "app-two");
      expect(appTwoGroup).toBeDefined();
      expect(appTwoGroup?.children).toHaveLength(2);

      // Standalone should be ungrouped
      expect(result.ungrouped).toHaveLength(1);
      expect(result.ungrouped[0].name).toBe("standalone");
    });

    it("should preserve project metadata in groups", () => {
      const parent = createMockProject({
        name: "my-project",
        path: "/Users/jack/my-project",
        actual_path: "/Users/jack/my-project",
        session_count: 5,
        message_count: 100,
        git_info: { worktree_type: "main" },
      });
      const worktree = createMockProject({
        name: "my-project",
        path: "/tmp/feature/my-project",
        session_count: 2,
        message_count: 25,
        git_info: {
          worktree_type: "linked",
          main_project_path: "/Users/jack/my-project",
        },
      });

      const result = detectWorktreeGroupsHybrid([parent, worktree]);

      expect(result.groups[0].parent.session_count).toBe(5);
      expect(result.groups[0].parent.message_count).toBe(100);
      expect(result.groups[0].children[0].session_count).toBe(2);
      expect(result.groups[0].children[0].message_count).toBe(25);
    });
  });

  describe("edge cases", () => {
    it("should handle projects with not_git worktree_type", () => {
      const projects = [
        createMockProject({
          name: "my-project",
          path: "/Users/jack/my-project",
          git_info: { worktree_type: "not_git" },
        }),
        createMockProject({
          name: "my-project",
          path: "/tmp/branch/my-project",
          git_info: { worktree_type: "not_git" },
        }),
      ];

      const result = detectWorktreeGroupsHybrid(projects);

      // not_git is treated as no git info - all ungrouped
      expect(result.groups).toHaveLength(0);
      expect(result.ungrouped).toHaveLength(2);
    });

    it("should handle mixed git_info availability", () => {
      const mainRepo = createMockProject({
        name: "my-project",
        path: "/Users/jack/my-project",
        actual_path: "/Users/jack/my-project",
        git_info: { worktree_type: "main" },
      });
      const linkedWorktree = createMockProject({
        name: "my-project",
        path: "/tmp/feature/my-project",
        git_info: {
          worktree_type: "linked",
          main_project_path: "/Users/jack/my-project",
        },
      });
      const noGitProject = createMockProject({
        name: "no-git",
        path: "/Users/jack/no-git",
        git_info: null,
      });

      const result = detectWorktreeGroupsHybrid([mainRepo, linkedWorktree, noGitProject]);

      expect(result.groups).toHaveLength(1);
      expect(result.ungrouped).toHaveLength(1);
      expect(result.ungrouped[0].name).toBe("no-git");
    });
  });
});
