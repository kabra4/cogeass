This project is a **dynamic API client and request testing tool** built with **React, TypeScript, and Vite**, utilizing the **Tauri framework** for cross-platform desktop execution (integrating a Rust backend via `reqwest` for network requests).

Its core functionality revolves around **OpenAPI (Swagger)** specifications:

1.  **Specification Loading & Conversion:** It can load specs from URLs or files, automatically detecting and converting **Swagger 2.0 to OpenAPI 3.0** using `swagger2openapi` and caching dereferenced specs in IndexedDB (`idb`).
2.  **Dynamic Request Building:** It leverages **`react-jsonschema-form` (`@rjsf`)** with a custom **Shadcn UI theme** to dynamically generate input forms for path, query, header, and body parameters based on the OpenAPI schema.
3.  **State Management & Templating:** It uses **Zustand** for global state, including robust **Workspace** and **Environment** management. Environment variables can be used to template values (like URLs and API tokens) across requests.
4.  **Execution & Output:** It features a dual HTTP client (Fetch/Tauri) and generates an executable **cURL command** from the final request configuration. It also supports configuring and applying security schemes (API Key, HTTP Basic/Bearer).

In essence, it's a comprehensive, modern desktop application for interacting with REST APIs defined by OpenAPI documents.

**Project Structure:**

### Root Configuration & Build Files

| File/Folder        | Summary                                                                                            |
| :----------------- | :------------------------------------------------------------------------------------------------- |
| `package.json`     | Project manifest, scripts, and dependencies (React, Tauri, RJSF, OpenAPI tooling).                 |
| `vite.config.ts`   | Vite configuration: Sets up React, Tailwind, and browser polyfills for Node modules.               |
| `tsconfig.*.json`  | TypeScript compiler settings for Node processes (`.node.json`) and application code (`.app.json`). |
| `.gitignore`       | Specifies files to ignore, including build outputs (`dist`) and Rust targets (`target/`).          |
| `eslint.config.js` | Configuration for ESLint, setting up recommended TypeScript and React linting rules.               |
| `components.json`  | Configuration file for the `shadcn/ui` CLI setup.                                                  |
| `index.html`       | Main entry HTML file for the web application.                                                      |

### Source Code: Application Core & State (`src/`)

| File/Folder                           | Summary                                                                                      |
| :------------------------------------ | :------------------------------------------------------------------------------------------- |
| `src/App.tsx`                         | Main component managing overall application layout and initial hydration.                    |
| `src/main.tsx`                        | React entry point, mounting the `<App />` component.                                         |
| `src/hooks/useHasHydrated.tsx`        | Hook to manage UI state until the Zustand store finishes rehydrating from storage.           |
| `src/hooks/useRequestBuilderState.ts` | Central hook managing request data, variable resolution, cURL generation, and sending logic. |
| `src/store/useAppStore.ts`            | Zustand store definition, enabling persistence for workspace data.                           |
| `src/store/types.ts`                  | Central type definitions for the entire Zustand state structure.                             |
| `src/store/*.slice.ts`                | Individual Zustand slices for Workspace, Spec, Request, UI, Auth, and Environment logic.     |
| `src/store/workspaceSlice.ts`         | Manages creation, switching, and persistence of workspaces.                                  |
| `src/store/specSlice.ts`              | Handles loading, updating, and storing the active OpenAPI specification.                     |

### Source Code: UI Components & Pages

| File/Folder                              | Summary                                                                                                |
| :--------------------------------------- | :----------------------------------------------------------------------------------------------------- |
| `src/pages/*.tsx`                        | Views for Workspace Explorer, Authorization setup, Environments management, and Headers configuration. |
| `src/components/Sidebar.tsx`             | Left-hand navigation panel for switching between main pages.                                           |
| `src/components/OperationExplorer.tsx`   | Lists and filters API operations from the loaded spec.                                                 |
| `src/components/RequestBuilder.tsx`      | Layout component that hosts the parameter forms and response previews.                                 |
| `src/components/RequestForms.tsx`        | Tabbed interface for inputting Path, Query, Headers, and Body data using RJSF.                         |
| `src/components/Previews.tsx`            | Displays the generated cURL, request Body JSON, and API response in a tabbed editor.                   |
| `src/components/HeaderEditor.tsx`        | Reusable component for editing key/value headers or variables in a row-based interface.                |
| `src/components/VariableEditor.tsx`      | Reusable component for editing key/value environment variables in a row-based interface.               |
| `src/components/WorkspaceSelector.tsx`   | Dropdown for selecting/managing API workspaces.                                                        |
| `src/components/EnvironmentSelector.tsx` | Dropdown for selecting the active API environment.                                                     |
| `src/components/SpecLoader.tsx`          | Component for loading specs via URL paste or file upload.                                              |
| `src/components/ui/*.tsx`                | Re-exported custom UI components based on `shadcn/ui`.                                                 |

### Source Code: RJSF Customizations

| File/Folder                            | Summary                                                                                           |
| :------------------------------------- | :------------------------------------------------------------------------------------------------ |
| `src/rjsf/index.ts`                    | Defines the custom Shadcn UI theme configuration for the RJSF library.                            |
| `src/rjsf/templates/*.tsx`             | Custom templates for field presentation (e.g., compact layout for objects/arrays).                |
| `src/rjsf/widgets/*.tsx`               | Custom input widgets for RJSF (e.g., for numbers, checkboxes, string arrays, multi-select enums). |
| `src/rjsf/fields/CustomAnyOfField.tsx` | Custom field logic to better handle `oneOf`/`anyOf` selection via a dropdown.                     |

### Source Code: Libraries & Utilities (`src/lib/`)

| File/Folder                           | Summary                                                                                                           |
| :------------------------------------ | :---------------------------------------------------------------------------------------------------------------- |
| `src/lib/openapi.ts`                  | Logic for fetching, parsing, converting (Swagger 2.0 $\to$ OAS 3.0), dereferencing specs, and listing operations. |
| `src/lib/schema.ts`                   | Logic to convert OpenAPI parameter/body structures into JSON Schema for RJSF forms.                               |
| `src/lib/request.ts`/`curl.ts`        | Utilities for constructing final request URLs and generating cURL command strings.                                |
| `src/lib/auth.ts`                     | Logic to resolve security schemes into applied HTTP headers and query parameters.                                 |
| `src/lib/templating.ts`               | Functions for recursively resolving `{{variable}}` placeholders in data structures.                               |
| `src/lib/storage/sqliteRepository.ts` | SQLite database interface for all data persistence operations (specs, workspaces, environments, etc.).            |
| `src/lib/http/index.ts`               | Selector that chooses between the browser `fetch` or Tauri backend HTTP client.                                   |
| `src/lib/http/FetchHttpClient.ts`     | Implementation of the HTTP client using standard browser `fetch` with timeout support.                            |
| `src/lib/http/TauriHttpClient.ts`     | Implementation of the HTTP client using Tauri's `invoke` to call the Rust backend.                                |
| `src/lib/environment-colors.ts`       | Utility for assigning unique color classes to different API environments.                                         |
| `src/lib/utils.ts`                    | General utilities, including class name merging (`cn`).                                                           |

### Tauri Backend (`src-tauri/`)

| File/Folder                 | Summary                                                                                         |
| :-------------------------- | :---------------------------------------------------------------------------------------------- |
| `src-tauri/src/main.rs`     | Rust backend entry point; registers Tauri commands for fetching specs and making HTTP requests. |
| `src-tauri/Cargo.toml`      | Rust project dependencies (`tauri`, `reqwest`, `tokio`).                                        |
| `src-tauri/tauri.conf.json` | Tauri application configuration, window settings, and API permissions.                          |
| `src-tauri/build.rs`        | Rust build script to configure the Tauri build process.                                         |
| `src-tauri/.gitignore`      | Git ignore specific to Rust artifacts.                                                          |
