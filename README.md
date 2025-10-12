# CoGeass

A web-based desktop application that turns OpenAPI 3.0/3.1 schemas into interactive forms to build JSON payloads without hand-editing. It renders nested objects, arrays, enums as selects, validates inputs, generates a cURL command, and can send the request to a target URL.

Built with Bun, Vite, React, shadcn/ui, RJSF and Tauri.

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

## License

MIT
