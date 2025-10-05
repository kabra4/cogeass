# OpenAPI JSON Form Builder (Web PoC)

A web-based proof of concept that turns OpenAPI 3.0/3.1 schemas into interactive forms to build JSON payloads without hand-editing. It renders nested objects, arrays, enums as selects, validates inputs, generates a cURL command, and can send the request to a target URL.

Built with Bun, Vite, React, shadcn/ui, and RJSF. Designed to be portable into a desktop shell (e.g., Tauri) later.

## Features

- Load OpenAPI spec from URL or file (JSON/YAML)
- Browse operations grouped by tag
- Auto-generated forms for:
  - Path parameters
  - Query parameters
  - Header parameters
  - JSON request body (deeply nested objects/arrays, enums)
- Live JSON preview of the request body
- cURL command generation using curl-generator
- Send request (fetch) and view response (status, headers, body)
- OpenAPI 3.1 first-class; OpenAPI 3.0 converted to JSON Schema

## Why

Editing raw JSON in Swagger UI/Postman is tedious and error-prone, especially with deep nesting and enums. This app reads the OpenAPI schema and renders input fields, selects, and add/remove controls so you click to build payloads. It’s extensible, fast, and designed to scale to complex schemas.

## Stack

- Runtime/build: Bun + Vite + React + TypeScript
- UI: shadcn/ui (Radix + Tailwind)
- Form engine: RJSF (@rjsf/core) with AJV v8 validator
- OpenAPI utilities:
  - @apidevtools/swagger-parser (bundle/validate/dereference)
  - @openapi-contrib/openapi-schema-to-json-schema (OAS 3.0 → JSON Schema)
- Request/cURL:
  - fetch for HTTP
  - curl-generator for cURL output
- Editor/preview: @monaco-editor/react
- State: Zustand

## Getting Started

Prerequisites:

- Bun installed

Install and run:

```bash
bun install
bun dev
```

Open http://localhost:5173 in your browser.

## Usage

1. Load a spec:

- Paste a spec URL (e.g., https://petstore3.swagger.io/api/v3/openapi.json) and click Load, or
- Upload a local .json/.yaml file

2. Pick an operation:

- Use the left panel to search and select a method/path

3. Enter a Base URL:

- Example: https://petstore3.swagger.io/api/v3
- The app interpolates path params and appends query strings

4. Fill forms:

- Path params, query, headers
- Request body (if defined for the operation). Enums render as selects, arrays support add/remove, nested objects render as sections.

5. Preview and send:

- Right panel shows body JSON and cURL
- Click Send to execute the request and view the response

## Project Structure

- src/app/App.tsx
  - Page layout: loader + explorer + builder
- src/components/
  - SpecLoader.tsx: Load spec by URL or file
  - OperationExplorer.tsx: List/search operations
  - RequestBuilder.tsx: Parameter/body forms, cURL, send, previews
- src/lib/
  - openapi.ts: Load, dereference, list operations, helpers
  - schema.ts: Build JSON Schema for params and request bodies
  - request.ts: URL builder and fetch sender
  - curl.ts: cURL generation using curl-generator
- src/rjsf/
  - index.ts: shadcn-themed widgets/templates (bridge)
  - validator.ts: AJV v8 validator preconfigured
  - widgets/\*: Minimal shadcn-based widgets (Input, Select, Checkbox)
- src/store/
  - useAppStore.ts: Spec, ops, selection state
- styles/globals.css: Tailwind base

## Key Implementation Details

- Spec loading:
  - swagger-parser bundle() resolves $refs and validates
  - OpenAPI 3.1 schemas are used as-is
  - OpenAPI 3.0 requestBody schemas are converted to JSON Schema 2020-12 via @openapi-contrib/openapi-schema-to-json-schema
- Forms:
  - RJSF renders forms from JSON Schema
  - AJV v8 validates inputs (rjsfValidator)
  - shadcn/ui widgets are wired into RJSF via a theme
- Parameters:
  - Separate forms for path/query/header/cookie (cookie optional in PoC)
  - Required path params enforced by schema
- URL building:
  - Interpolates {param} in path
  - Appends query params with URLSearchParams
  - Arrays produce repeated k=v pairs
- cURL:
  - curl-generator produces a clean, browser-friendly cURL string
  - Content-Type header set automatically if mediaType is present
- Request sending:
  - Uses fetch with method, headers, and JSON body when appropriate
  - Response auto-parsed as JSON if possible, otherwise shown as text

## Extensibility Roadmap

- Parameter styles: Honor OpenAPI style/explode per-parameter (form, spaceDelimited, pipeDelimited, deepObject)
- Security schemes:
  - API key, Bearer, Basic; environment profiles; OS keychain when ported to desktop
- Content types:
  - multipart/form-data with file pickers
  - application/x-www-form-urlencoded
- Discriminator and unions:
  - Custom UI for oneOf/anyOf/allOf + discriminator
- Response validation:
  - Validate responses against OpenAPI responses and highlight mismatches
- Performance:
  - Collapsible sections, virtualized trees for massive schemas, debounced validation
- Import/export:
  - Save sessions/environments; import Postman environments
- Desktop build:
  - Reuse React app in a Tauri shell for native menus, file dialogs, and keychain storage

## Commands

- Dev server:

```bash
bun dev
```

- Build:

```bash
bun run build
```

- Preview prod build:

```bash
bun run preview
```

## Configuration and Theming

- Tailwind/shadcn is set up for consistent styling
- RJSF widgets map to shadcn components in src/rjsf/widgets
- You can add custom field templates (Array/Object) to adjust layout and controls

## Known Limitations (PoC)

- Only JSON request bodies are rendered
- Parameter serialization styles beyond simple form arrays are not yet implemented
- No auth UI yet; add headers manually for now
- Large/complex schemas may need template tweaks for best UX

## Troubleshooting

- TypeScript error: “validator is required” on RJSF
  - Ensure validator={rjsfValidator} is passed to every form
- httpsnippet errors in browser
  - This PoC uses curl-generator instead; no Node polyfills needed
- OpenAPI 3.0 schema not rendering
  - Confirm conversion via @openapi-contrib/openapi-schema-to-json-schema and that requestBody content type is application/json or application/\*+json

## Dependencies

- @apidevtools/swagger-parser
- @openapi-contrib/openapi-schema-to-json-schema
- @rjsf/core, @rjsf/validator-ajv8, ajv, ajv-formats
- curl-generator
- @monaco-editor/react
- zustand
- shadcn/ui, tailwindcss, radix-ui

## License

MIT

## Credits

- Based on the OpenAPI Specification and JSON Schema ecosystem
- UI powered by shadcn/ui and Radix primitives
- Form rendering by RJSF and validation by AJV

## Next Steps

- Implement parameter style/explode support
- Add auth (API key/Bearer/Basic) and environments
- Add multipart/form-data support
- Package as a desktop app via Tauri reusing this UI

If you want, I can include a sample Petstore spec in the repo and a guided walkthrough with screenshots.
