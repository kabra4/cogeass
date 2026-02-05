/**
 * Postman Collection v2.1 Types
 * Based on https://schema.postman.com/json/collection/v2.1.0/collection.json
 */

export interface PostmanCollection {
  info: PostmanInfo;
  item: PostmanItem[];
  variable?: PostmanVariable[];
  auth?: PostmanAuth;
}

export interface PostmanInfo {
  name: string;
  description?: string;
  schema: string; // Should contain "getpostman.com"
  version?: string;
}

export interface PostmanItem {
  name: string;
  item?: PostmanItem[]; // Nested folder
  request?: PostmanRequest;
  response?: PostmanResponse[];
  description?: string;
  event?: PostmanEvent[];
  auth?: PostmanAuth;
}

export interface PostmanRequest {
  method: string;
  url: PostmanUrl | string;
  header?: PostmanHeader[];
  body?: PostmanBody;
  description?: string;
  auth?: PostmanAuth;
}

export interface PostmanUrl {
  raw?: string;
  protocol?: string;
  host?: string[];
  port?: string;
  path?: string[];
  query?: PostmanQuery[];
  variable?: PostmanVariable[];
}

export interface PostmanQuery {
  key: string;
  value?: string;
  description?: string;
  disabled?: boolean;
}

export interface PostmanHeader {
  key: string;
  value: string;
  description?: string;
  disabled?: boolean;
}

export interface PostmanBody {
  mode?: "raw" | "urlencoded" | "formdata" | "file" | "graphql";
  raw?: string;
  urlencoded?: PostmanUrlEncoded[];
  formdata?: PostmanFormData[];
  file?: PostmanFile;
  graphql?: PostmanGraphQL;
  options?: {
    raw?: {
      language?: string;
    };
  };
}

export interface PostmanUrlEncoded {
  key: string;
  value?: string;
  description?: string;
  disabled?: boolean;
}

export interface PostmanFormData {
  key: string;
  value?: string;
  type?: "text" | "file";
  src?: string;
  description?: string;
  disabled?: boolean;
}

export interface PostmanFile {
  src?: string;
  content?: string;
}

export interface PostmanGraphQL {
  query?: string;
  variables?: string;
}

export interface PostmanResponse {
  name?: string;
  originalRequest?: PostmanRequest;
  status?: string;
  code?: number;
  header?: PostmanHeader[];
  body?: string;
  _postman_previewlanguage?: string;
}

export interface PostmanAuth {
  type: string;
  apikey?: PostmanAuthParam[];
  bearer?: PostmanAuthParam[];
  basic?: PostmanAuthParam[];
  oauth2?: PostmanAuthParam[];
  awsv4?: PostmanAuthParam[];
  hawk?: PostmanAuthParam[];
  digest?: PostmanAuthParam[];
  ntlm?: PostmanAuthParam[];
}

export interface PostmanAuthParam {
  key: string;
  value: string;
  type?: string;
}

export interface PostmanVariable {
  key: string;
  value?: string;
  description?: string;
  disabled?: boolean;
  type?: string;
}

export interface PostmanEvent {
  listen: "prerequest" | "test";
  script?: PostmanScript;
}

export interface PostmanScript {
  type?: string;
  exec?: string[];
}

/**
 * Check if an object is a valid Postman Collection.
 */
export function isPostmanCollection(obj: unknown): obj is PostmanCollection {
  if (typeof obj !== "object" || obj === null) return false;
  const collection = obj as PostmanCollection;
  return (
    typeof collection.info === "object" &&
    collection.info !== null &&
    typeof collection.info.schema === "string" &&
    collection.info.schema.includes("getpostman.com") &&
    Array.isArray(collection.item)
  );
}
