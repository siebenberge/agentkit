import { ERROR_CODES } from '~/lib/content';
import { docSections, searchDocs } from '~/lib/docs';
import { getDict } from '~/lib/i18n';
import type { KitId } from '~/lib/i18n/types';
import {
  type McpTool,
  ToolInputError,
  createMcpHandler,
  requiredString,
} from '~/lib/mcp-server';
import { SITE_URL } from '~/lib/site';

/**
 * Docs MCP of agentkit (public, read-only): search llms.txt, the kit READMEs,
 * their reference docs and the error reference from a coding agent.
 * `claude mcp add --transport http agentkit https://agentkit.ch/mcp`
 */

const KITS: KitId[] = ['subkit', 'shopkit'];

const INSTRUCTIONS = `Documentation of agentkit: subkit (subscriptions, invoices, QR-bill, TWINT, Swiss VAT) and shopkit (catalog, cart, checkout, orders) – TypeScript libraries that run inside the app, with the data in its own database.
- search_docs finds sections by words; read_doc returns one in full; list_docs lists them all.
- Sources: llms.txt (overview), the kit READMEs (setup) and the reference docs of each kit (every option, method, route, event, table and component).
- explain_error gives cause and fix of an error code (errors of the kits link to ${SITE_URL}/errors#<kit>-<CODE>).
- Features marked next or planned are not built yet.`;

const kitArgument = {
  type: 'string',
  enum: KITS,
  description: 'Only this kit (optional).',
};

const tools: McpTool[] = [
  {
    name: 'search_docs',
    title: 'Search the docs',
    description:
      'Find documentation sections (setup, configuration options, engine methods, HTTP routes, events, tables, React components, Swiss specifics, error codes) by words. Returns ids, titles and snippets; read a section with read_doc.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Words to look for, e.g. "QR-bill reference camt".',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, idempotentHint: true },
    run: (args) =>
      Promise.resolve({ results: searchDocs(requiredString(args, 'query')) }),
  },
  {
    name: 'read_doc',
    title: 'Read a docs section',
    description:
      'The full text of one section, by the id from search_docs or list_docs.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description:
            'e.g. "subkit/mcp-server-for-your-team" (README) or "shopkit/docs/configuration" (a reference page).',
        },
      },
      required: ['id'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, idempotentHint: true },
    run: (args) => {
      const id = requiredString(args, 'id');
      const section = docSections().find((each) => each.id === id);

      if (!section) {
        throw new ToolInputError(
          `No section "${id}" – use search_docs or list_docs for ids`,
        );
      }

      return Promise.resolve(section);
    },
  },
  {
    name: 'list_docs',
    title: 'List docs sections',
    description:
      'Ids and titles of all sections (without the error codes; use explain_error for those).',
    inputSchema: { type: 'object', additionalProperties: false },
    annotations: { readOnlyHint: true, idempotentHint: true },
    run: () =>
      Promise.resolve({
        sections: docSections()
          .filter((section) => !section.id.startsWith('errors/'))
          .map(({ id, title, source }) => ({ id, title, source })),
      }),
  },
  {
    name: 'explain_error',
    title: 'Explain an error code',
    description:
      'Cause and fix of an error code of subkit or shopkit (e.g. PLAN_NOT_FOUND, OUT_OF_STOCK), with its HTTP status.',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'The code, e.g. "OVERDUE_INVOICE".',
        },
        kit: kitArgument,
      },
      required: ['code'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, idempotentHint: true },
    run: (args) => {
      const code = requiredString(args, 'code', 60).toUpperCase();
      const kit = args.kit;

      if (kit !== undefined && !KITS.includes(kit as KitId)) {
        throw new ToolInputError('"kit" must be subkit or shopkit');
      }

      const texts = getDict('en').errors.codes;
      const matches = KITS.filter(
        (each) => kit === undefined || each === kit,
      ).flatMap((each) =>
        ERROR_CODES[each]
          .filter((entry) => entry.code === code)
          .map((entry) => ({
            kit: each,
            code,
            statuses: entry.statuses,
            cause: texts[entry.doc].cause,
            fix: texts[entry.doc].fix,
            url: `${SITE_URL}/en/errors#${each}-${code}`,
          })),
      );

      if (matches.length === 0) {
        throw new ToolInputError(
          `Unknown code "${code}" – see ${SITE_URL}/en/errors for all codes`,
        );
      }

      return Promise.resolve({ errors: matches });
    },
  },
];

const handler = createMcpHandler({
  name: 'agentkit-docs',
  version: '1.0.0',
  instructions: INSTRUCTIONS,
  tools,
  // public and read-only
  authorize: () => true,
  describeError: () => null,
  onError: (error) => console.error('mcp: tool failed', error),
});

export const POST = handler;
export const DELETE = handler;

/** MCP clients get 405 (no SSE stream); a browser gets a short how-to. */
export function GET(request: Request) {
  if ((request.headers.get('accept') ?? '').includes('text/event-stream')) {
    return handler(request);
  }

  return new Response(
    `agentkit docs MCP server (Streamable HTTP, read-only)\n\nClaude Code:  claude mcp add --transport http agentkit ${SITE_URL}/mcp\nOther clients: add ${SITE_URL}/mcp as a remote MCP server (no key needed).\n\nTools: search_docs, read_doc, list_docs, explain_error\n`,
    { headers: { 'content-type': 'text/plain; charset=utf-8' } },
  );
}
