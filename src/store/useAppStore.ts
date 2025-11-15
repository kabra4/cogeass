import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createSpecSlice } from "./specSlice";
import { createRequestSlice } from "./requestSlice";
import { createUiSlice } from "./uiSlice";
import { createAuthSlice } from "./authSlice";
import { createEnvironmentSlice } from "./environmentSlice";
import { createWorkspaceSlice } from "./workspaceSlice";
import { createHistorySlice } from "./historySlice";
import type {
  AppState,
  Workspace,
  AuthState,
  Environment,
  HistoryItem,
} from "./types";

export const useAppStore = create<AppState>()(
  persist(
    (set, get, api) => ({
      ...createWorkspaceSlice(set, get, api),
      ...createSpecSlice(set, get, api),
      ...createRequestSlice(set, get, api),
      ...createUiSlice(set, get, api),
      ...createAuthSlice(set, get, api),
      ...createEnvironmentSlice(set, get, api),
      ...createHistorySlice(set, get, api),
    }),
    {
      name: "cogeass-storage",
      // Persist only workspace container; runtime (spec, ops) are derived, not persisted.
      partialize: (state) => {
        // Deep copy workspaces but exclude operationState from each workspace
        const workspacesCopy: Record<string, Workspace> = {};
        for (const [id, ws] of Object.entries(state.workspaces)) {
          workspacesCopy[id] = {
            ...ws,
            data: {
              ...ws.data,
              operationState: {}, // Don't persist operationState to localStorage
            },
          };
        }
        return {
          workspaces: workspacesCopy,
          workspaceOrder: state.workspaceOrder,
          activeWorkspaceId: state.activeWorkspaceId,
        };
      },
      merge: (persistedState, currentState) => {
        // Migration: convert legacy single-workspace persisted data into first workspace
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const persisted = persistedState as any;
        const next = { ...currentState } as AppState;

        if (
          persisted?.workspaces &&
          Object.keys(persisted.workspaces).length > 0
        ) {
          // New format already
          next.workspaces = persisted.workspaces as Record<string, Workspace>;
          next.workspaceOrder =
            (persisted.workspaceOrder as string[]) ||
            Object.keys(persisted.workspaces);
          next.activeWorkspaceId =
            (persisted.activeWorkspaceId as string) ||
            next.workspaceOrder[0] ||
            null;
          return next;
        }

        // Legacy fields - use any for simplicity in migration
        const legacySpecId = (persisted?.specId as string) ?? null;
        const legacyBaseUrl = (persisted?.baseUrl as string) ?? "";
        const legacySelected = persisted?.selected ?? null;
        const legacyAuth = (persisted?.auth as AuthState) ?? {
          schemes: {},
          values: {},
        };
        const legacyEnvs =
          (persisted?.environments as Record<string, Environment>) ?? {};
        let legacyKeys = (persisted?.environmentKeys as string[]) ?? [];
        const legacyHistory: HistoryItem[] = Array.isArray(persisted?.history)
          ? (persisted.history as HistoryItem[])
          : [];

        // Normalize keys if missing
        if (!Array.isArray(legacyKeys) || legacyKeys.length === 0) {
          const setKeys = new Set<string>();
          Object.values(legacyEnvs).forEach((env) => {
            if (
              env &&
              typeof env === "object" &&
              "variables" in env &&
              env.variables
            ) {
              Object.keys(env.variables).forEach((k) => setKeys.add(k));
            }
          });
          legacyKeys = Array.from(setKeys);
        }

        const normalizedEnvs: Record<string, Environment> = {};
        for (const [id, env] of Object.entries(legacyEnvs)) {
          if (env && typeof env === "object") {
            const vars: Record<string, string> = {};
            legacyKeys.forEach((k) => {
              const variables =
                "variables" in env
                  ? (env.variables as Record<string, string>)
                  : {};
              vars[k] = variables?.[k] ?? "";
            });
            normalizedEnvs[id] = {
              id: (env.id as string) || id,
              name: (env.name as string) || `Environment ${id}`,
              variables: vars,
            };
          }
        }

        const legacySelectedKey =
          legacySelected &&
          typeof legacySelected === "object" &&
          "method" in legacySelected &&
          "path" in legacySelected
            ? `${legacySelected.method}:${legacySelected.path}`.toLowerCase()
            : null;

        // Create a default workspace with legacy data
        const wsId = `ws_${Date.now().toString(36)}`;
        next.workspaces = {
          [wsId]: {
            id: wsId,
            name: "Workspace 1",
            specId: legacySpecId,
            data: {
              baseUrl: legacyBaseUrl,
              globalHeaders:
                (persisted?.globalHeaders as Record<string, string>) ?? {},
              operationState: {}, // Legacy operationState not loaded; will be in IndexedDB
              selectedKey: legacySelectedKey,
              auth: legacyAuth,
              environments: normalizedEnvs,
              environmentKeys: legacyKeys,
              activeEnvironmentId:
                (persisted?.activeEnvironmentId as string) ?? null,
              history: legacyHistory,
            },
          },
        };
        next.workspaceOrder = [wsId];
        next.activeWorkspaceId = wsId;
        return next;
      },
    }
  )
);
