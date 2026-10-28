/**
 * A small MCP server (Model Context Protocol) over Streamable HTTP as one
 * fetch handler: stateless, JSON responses only, no SDK. It speaks the
 * current revision (2026-07-28: version and capabilities in every request's
 * `_meta`, `server/discover`, headers mirrored from the body) and the
 * earlier ones that open with `initialize` (2025-03-26 … 2025-11-25), so
 * every MCP client of today can connect.
 *
 * Copy of subkit's `src/mcp/server.ts` (also in `apps/web/lib/mcp-server.ts`)
 * until `@agentkit.ch/core` exists – change all three together.
 */

type MaybePromise<T> = T | Promise<T>;

type JsonObject = Record<string, unknown>;

/** JSON Schema (2020-12) of a tool's arguments. */
export type ToolInputSchema = {
  type: 'object';
  properties?: Record<string, JsonObject>;
  required?: string[];
  additionalProperties?: boolean;
};

export type McpTool = {
  /** `snake_case`, unique within the server. */
  name: string;
  title: string;
  /** What it does and when to use it – the model reads this. */
  description: string;
  inputSchema: ToolInputSchema;
  annotations: {
    /** Only reads. Callers with `'read-only'` access see only these tools. */
    readOnlyHint: boolean;
    /** May delete or irreversibly change data (clients ask for confirmation). */
    destructiveHint?: boolean;
    /** Calling it twice with the same arguments changes nothing more. */
    idempotentHint?: boolean;
    /** Talks to an outside system (e.g. the payment provider). */
    openWorldHint?: boolean;
  };
  /**
   * Result as JSON – dates become ISO strings. `context.request` is the HTTP
   * request (headers only, the body is read): tools that act for the caller
   * identify them with it.
   */
  run: (args: JsonObject, context: ToolContext) => Promise<unknown>;
};

export type ToolContext = { request: Request };

/** A known error of the tool's domain, returned to the model as `isError`. */
export type ToolErrorDetails = {
  error: string;
  message: string;
  /** Cause and fix of the code. */
  docs?: string;
};

export type McpServerOptions = {
  name: string;
  version: string;
  /** How to use the server – shown to the model. */
  instructions?: string;
  tools: McpTool[];
  /**
   * Who may call: `false` → 401, `'read-only'` → only the tools that read.
   * Called for every request (MCP has no session).
   */
  authorize: (request: Request) => MaybePromise<boolean | 'read-only'>;
  /**
   * Browser origins allowed besides the endpoint's own. A request with any
   * other `Origin` header gets 403 (DNS rebinding, cross-site calls).
   */
  allowedOrigins?: string[];
  /** Turns a domain error into a tool error; `null` = unexpected. */
  describeError: (error: unknown) => ToolErrorDetails | null;
  /** Unexpected errors (the model only sees `INTERNAL_ERROR`). */
  onError?: (error: unknown, request: Request) => void;
};

/** Revisions with per-request `_meta` (no `initialize`). */
export const MODERN_VERSIONS = ['2026-07-28'];
/** Revisions that open with `initialize`, newest first. */
export const LEGACY_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26'];

const META = 'io.modelcontextprotocol/';
/**
 * Caching hints (2026-07-28) of `server/discover` and `tools/list`: private,
 * because the tools depend on the caller's access.
 */
const CACHE = { ttlMs: 300_000, cacheScope: 'private' } as const;
const MAX_BODY = 1_000_000;

/** Wrong argument of a tool call – the message tells the model what to fix. */
export class ToolInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ToolInputError';
  }
}

export function createMcpHandler(options: McpServerOptions) {
  const serverInfo = { name: options.name, version: options.version };
  const allowedOrigins = options.allowedOrigins ?? [];
  const names = new Set<string>();

  for (const tool of options.tools) {
    if (names.has(tool.name)) throw new Error(`Duplicate tool ${tool.name}`);
    names.add(tool.name);
  }

  return async function handle(request: Request): Promise<Response> {
    // no standalone SSE stream (GET) and no sessions to end (DELETE)
    if (request.method !== 'POST') {
      return new Response(null, { status: 405, headers: { allow: 'POST' } });
    }

    const origin = request.headers.get('origin');

    if (
      origin !== null &&
      origin !== new URL(request.url).origin &&
      !allowedOrigins.includes(origin)
    ) {
      return rpcError(null, -32600, 'Origin not allowed', 403);
    }

    const mediaType = (request.headers.get('content-type') ?? '')
      .split(';')[0]!
      .trim()
      .toLowerCase();

    if (mediaType !== 'application/json') {
      return rpcError(
        null,
        -32600,
        'Content-Type must be application/json',
        415,
      );
    }

    let access: boolean | 'read-only';

    try {
      access = await options.authorize(request);
    } catch (error) {
      options.onError?.(error, request);
      return rpcError(null, -32603, 'Internal error', 500);
    }

    if (!access) return rpcError(null, -32600, 'Unauthorized', 401);

    const raw = await request.text();

    if (raw.length > MAX_BODY) {
      return rpcError(null, -32600, 'Request too large', 413);
    }

    let message: unknown;

    try {
      message = JSON.parse(raw);
    } catch {
      return rpcError(null, -32700, 'Parse error', 400);
    }

    if (
      !isObject(message) ||
      message.jsonrpc !== '2.0' ||
      typeof message.method !== 'string'
    ) {
      // batches are not part of MCP since 2025-06-18
      return rpcError(null, -32600, 'Invalid request', 400);
    }

    // notifications (`notifications/initialized`, …) need no answer
    if (!('id' in message)) return new Response(null, { status: 202 });

    const id = message.id;

    if (typeof id !== 'string' && typeof id !== 'number') {
      return rpcError(null, -32600, 'Invalid request id', 400);
    }

    if (message.params !== undefined && !isObject(message.params)) {
      return rpcError(id, -32602, 'params must be an object', 400);
    }

    const params = message.params ?? {};
    const meta = isObject(params._meta) ? params._meta : {};
    const tools =
      access === 'read-only'
        ? options.tools.filter((tool) => tool.annotations.readOnlyHint)
        : options.tools;
    const context = { request, id, method: message.method, params, tools };

    return META + 'protocolVersion' in meta
      ? modern(context, meta)
      : legacy(context);
  };

  type Context = {
    request: Request;
    id: string | number;
    method: string;
    params: JsonObject;
    tools: McpTool[];
  };

  /** 2026-07-28 and later: everything the server needs is in the request. */
  async function modern(context: Context, meta: JsonObject) {
    const { request, id, method, params } = context;
    const version = meta[META + 'protocolVersion'];
    const mismatch = (what: string) =>
      rpcError(id, -32020, `Header mismatch: ${what}`, 400);

    if (typeof version !== 'string') {
      return rpcError(id, -32602, 'Invalid protocol version', 400);
    }
    if (request.headers.get('mcp-protocol-version') !== version) {
      return mismatch('MCP-Protocol-Version');
    }
    if (request.headers.get('mcp-method') !== method) {
      return mismatch('Mcp-Method');
    }
    if (
      method === 'tools/call' &&
      decodeHeader(request.headers.get('mcp-name')) !== params.name
    ) {
      return mismatch('Mcp-Name');
    }
    if (!MODERN_VERSIONS.includes(version)) {
      return rpcError(id, -32022, 'Unsupported protocol version', 400, {
        supported: [...MODERN_VERSIONS, ...LEGACY_VERSIONS],
        requested: version,
      });
    }
    if (!isObject(meta[META + 'clientCapabilities'])) {
      return rpcError(
        id,
        -32602,
        `Missing _meta "${META}clientCapabilities"`,
        400,
      );
    }

    const result = (value: JsonObject) =>
      rpcResult(id, {
        resultType: 'complete',
        ...value,
        _meta: { [META + 'serverInfo']: serverInfo },
      });

    switch (method) {
      case 'server/discover':
        return result({
          supportedVersions: [...MODERN_VERSIONS, ...LEGACY_VERSIONS],
          capabilities: { tools: {} },
          ...(options.instructions
            ? { instructions: options.instructions }
            : {}),
          ...CACHE,
        });
      case 'ping':
        return result({});
      case 'tools/list':
        return result({ tools: context.tools.map(definition), ...CACHE });
      case 'tools/call': {
        const outcome = await callTool(context);

        return outcome.ok
          ? result(outcome.result)
          : rpcError(id, -32602, outcome.message, 400);
      }
      default:
        return rpcError(id, -32601, 'Method not found', 404);
    }
  }

  /** 2025-03-26 … 2025-11-25: `initialize` first, errors with HTTP 200. */
  async function legacy(context: Context) {
    const { request, id, method, params } = context;

    if (method === 'initialize') {
      const requested = params.protocolVersion;
      const version =
        typeof requested === 'string' && LEGACY_VERSIONS.includes(requested)
          ? requested
          : LEGACY_VERSIONS[0]!;

      return rpcResult(id, {
        protocolVersion: version,
        capabilities: { tools: { listChanged: false } },
        serverInfo,
        ...(options.instructions ? { instructions: options.instructions } : {}),
      });
    }

    const header = request.headers.get('mcp-protocol-version');

    // a 2026-07-28 client that left out the required `_meta`
    if (header !== null && MODERN_VERSIONS.includes(header)) {
      return rpcError(
        id,
        -32602,
        `Missing _meta "${META}protocolVersion"`,
        400,
      );
    }
    if (header !== null && !LEGACY_VERSIONS.includes(header)) {
      return rpcError(
        id,
        -32600,
        `Unsupported protocol version ${header}`,
        400,
      );
    }

    switch (method) {
      case 'ping':
        return rpcResult(id, {});
      case 'tools/list':
        return rpcResult(id, { tools: context.tools.map(definition) });
      case 'tools/call': {
        const outcome = await callTool(context);

        return outcome.ok
          ? rpcResult(id, outcome.result)
          : rpcError(id, -32602, outcome.message, 200);
      }
      default:
        return rpcError(id, -32601, 'Method not found', 200);
    }
  }

  /** A tool result (also for failed tools), or a protocol error. */
  async function callTool(
    context: Context,
  ): Promise<
    { ok: true; result: JsonObject } | { ok: false; message: string }
  > {
    const { params } = context;
    const tool = context.tools.find((each) => each.name === params.name);

    if (!tool) {
      return { ok: false, message: `Unknown tool: ${String(params.name)}` };
    }
    if (params.arguments !== undefined && !isObject(params.arguments)) {
      return { ok: false, message: 'arguments must be an object' };
    }

    try {
      const value = await tool.run(params.arguments ?? {}, {
        request: context.request,
      });

      return { ok: true, result: toolResult(value, false) };
    } catch (error) {
      if (error instanceof ToolInputError) {
        return {
          ok: true,
          result: toolResult(
            { error: 'INVALID_INPUT', message: error.message },
            true,
          ),
        };
      }

      const known = options.describeError(error);

      if (known) return { ok: true, result: toolResult(known, true) };

      options.onError?.(error, context.request);

      return {
        ok: true,
        result: toolResult(
          {
            error: 'INTERNAL_ERROR',
            message: 'Unexpected error – details are in the server log',
          },
          true,
        ),
      };
    }
  }
}

function definition(tool: McpTool) {
  return {
    name: tool.name,
    title: tool.title,
    description: tool.description,
    inputSchema: tool.inputSchema,
    annotations: { title: tool.title, ...tool.annotations },
  };
}

/** Text for every client, `structuredContent` (always an object) for newer ones. */
function toolResult(value: unknown, isError: boolean): JsonObject {
  const plain: unknown =
    value === undefined ? null : JSON.parse(JSON.stringify(value));
  const structured = isObject(plain) ? plain : { result: plain };

  return {
    content: [{ type: 'text', text: JSON.stringify(structured, null, 2) }],
    structuredContent: structured,
    isError,
  };
}

function rpcResult(id: string | number, result: JsonObject) {
  return Response.json(
    { jsonrpc: '2.0', id, result },
    { headers: { 'cache-control': 'no-store' } },
  );
}

function rpcError(
  id: string | number | null,
  code: number,
  message: string,
  status: number,
  data?: unknown,
) {
  return Response.json(
    {
      jsonrpc: '2.0',
      ...(id === null ? {} : { id }),
      error: { code, message, ...(data === undefined ? {} : { data }) },
    },
    { status, headers: { 'cache-control': 'no-store' } },
  );
}

/** `Mcp-Name` may carry `=?base64?…?=` for values that are not plain ASCII. */
function decodeHeader(value: string | null) {
  if (value === null) return null;

  const match = /^=\?base64\?(.*)\?=$/.exec(value);

  if (!match) return value;

  try {
    const bytes = Uint8Array.from(atob(match[1]!), (char) =>
      char.charCodeAt(0),
    );

    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// ------------------------------------------------------- argument helpers

export function requiredString(args: JsonObject, key: string, max = 200) {
  const value = args[key];

  if (typeof value !== 'string' || value.trim() === '' || value.length > max) {
    throw new ToolInputError(`"${key}" must be a text of 1–${max} characters`);
  }

  return value.trim();
}

export function optionalString(args: JsonObject, key: string, max = 500) {
  const value = args[key];

  if (value === undefined || value === null || value === '') return null;

  return requiredString(args, key, max);
}

export function optionalBoolean(args: JsonObject, key: string) {
  const value = args[key];

  if (value === undefined || value === null) return null;
  if (typeof value !== 'boolean') {
    throw new ToolInputError(`"${key}" must be true or false`);
  }

  return value;
}

export function optionalInteger(
  args: JsonObject,
  key: string,
  range: { min: number; max: number },
) {
  const value = args[key];

  if (value === undefined || value === null) return null;
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < range.min ||
    value > range.max
  ) {
    throw new ToolInputError(
      `"${key}" must be a whole number from ${range.min} to ${range.max}`,
    );
  }

  return value;
}

export function requiredInteger(
  args: JsonObject,
  key: string,
  range: { min: number; max: number },
) {
  const value = optionalInteger(args, key, range);

  if (value === null) throw new ToolInputError(`"${key}" is required`);

  return value;
}

export function requiredOneOf<T extends string>(
  args: JsonObject,
  key: string,
  allowed: readonly T[],
): T {
  const value = args[key];

  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new ToolInputError(`"${key}" must be one of ${allowed.join(', ')}`);
  }

  return value as T;
}

export function optionalList<T extends string>(
  args: JsonObject,
  key: string,
  allowed: readonly T[],
): T[] | undefined {
  const value = args[key];

  if (value === undefined || value === null) return undefined;
  if (
    !Array.isArray(value) ||
    value.some(
      (each) => typeof each !== 'string' || !allowed.includes(each as T),
    )
  ) {
    throw new ToolInputError(
      `"${key}" must be a list of ${allowed.join(', ')}`,
    );
  }

  return value.length > 0 ? (value as T[]) : undefined;
}
