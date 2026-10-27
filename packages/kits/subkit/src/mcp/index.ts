import type { Subscriptions } from '../engine';
import { isSubscriptionError } from '../errors';
import type { BillingInterval, PaymentMethod } from '../types';
import { VERSION } from '../version';
import {
  type McpTool,
  createMcpHandler,
  optionalBoolean,
  optionalString,
  requiredOneOf,
  requiredString,
} from './server';

export {
  LEGACY_VERSIONS,
  MODERN_VERSIONS,
  ToolInputError,
  createMcpHandler,
  type McpServerOptions,
  type McpTool,
} from './server';

type MaybePromise<T> = T | Promise<T>;

export type SubscriptionsMcpOptions = {
  subscriptions: Subscriptions;
  /**
   * Whether the caller may run the tools – your staff or API-token check.
   * `'read-only'` offers only the tools that read. The tools act on every
   * customer: never hand this endpoint to customers.
   */
  authorize: (request: Request) => MaybePromise<boolean | 'read-only'>;
  /** Browser origins allowed besides the endpoint's own (default none). */
  allowedOrigins?: string[];
  /** Extra guidance for the model, appended to the built-in instructions. */
  instructions?: string;
  onError?: (error: unknown, request: Request) => void;
};

const INTERVALS: BillingInterval[] = ['month', 'year'];

const INSTRUCTIONS = `Billing of this app (subkit): plans, subscriptions and invoices of its customers.
- A customer is identified by externalId, the app's own id of the billed entity (user, team, club). Use find_customers to get it from an email.
- Amounts are in minor units (Rappen/cents): 1900 = CHF 19.00. Dates are ISO 8601.
- Look before you change: read get_billing first, and confirm plan changes, cancellations and voided invoices with the user.
- Errors carry a code and a docs link with cause and fix.`;

/**
 * MCP server for the operator of the app: an agent (Claude, Cursor, …) can
 * look up customers, plans and invoices and change subscriptions – with your
 * `authorize` on every request. Mount it like the HTTP handler, e.g. at
 * `app/api/billing-mcp/route.ts`: `export const POST = handler`.
 *
 * Tools: list_plans, find_customers, get_billing, get_invoice, change_plan,
 * cancel_subscription, resume_subscription, switch_to_invoice,
 * mark_invoice_paid, void_invoice.
 */
export function createSubscriptionsMcpHandler(
  options: SubscriptionsMcpOptions,
) {
  return createMcpHandler({
    name: 'subkit',
    version: VERSION,
    instructions: options.instructions
      ? `${INSTRUCTIONS}\n\n${options.instructions}`
      : INSTRUCTIONS,
    tools: subscriptionTools(options.subscriptions),
    authorize: options.authorize,
    allowedOrigins: options.allowedOrigins,
    describeError: (error) =>
      isSubscriptionError(error)
        ? {
            error: error.code,
            message: error.message,
            docs: error.docsUrl,
          }
        : null,
    onError: options.onError,
  });
}

const externalId = {
  type: 'string',
  description: "The app's id of the billed customer (see find_customers).",
};

export function subscriptionTools(subscriptions: Subscriptions): McpTool[] {
  return [
    {
      name: 'list_plans',
      title: 'List plans',
      description:
        'All plans with prices per interval (minor units), features and limits, the default (free) plan and the VAT setting.',
      inputSchema: { type: 'object', additionalProperties: false },
      annotations: { readOnlyHint: true },
      run: () =>
        Promise.resolve({
          plans: subscriptions.plans,
          defaultPlanId: subscriptions.settings.defaultPlanId,
          tax: subscriptions.settings.tax,
          invoiceDueDays: subscriptions.settings.invoiceDueDays,
        }),
    },
    {
      name: 'find_customers',
      title: 'Find customers',
      description:
        'Billing customers with this email address (externalId, name, address). Use the externalId for the other tools.',
      inputSchema: {
        type: 'object',
        properties: {
          email: { type: 'string', description: 'Email address, exact.' },
        },
        required: ['email'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      run: async (args) => ({
        customers: await subscriptions.findCustomers({
          email: requiredString(args, 'email', 320),
        }),
      }),
    },
    {
      name: 'get_billing',
      title: 'Get billing of a customer',
      description:
        'Subscription (plan, status, period, trial, scheduled change, cancellation), payment method (brand, last 4 digits), entitlements and the last 50 invoices of one customer.',
      inputSchema: {
        type: 'object',
        properties: { externalId },
        required: ['externalId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      run: async (args) => {
        const id = requiredString(args, 'externalId');
        const overview = await subscriptions.getOverview(id);

        if (!overview.customer) {
          return { customer: null, note: `No billing customer "${id}" yet` };
        }

        return {
          ...overview,
          paymentMethod: paymentMethodView(overview.paymentMethod),
        };
      },
    },
    {
      name: 'get_invoice',
      title: 'Get an invoice',
      description:
        'One invoice of a customer: number, status, lines, VAT, total, due date, payment attempts.',
      inputSchema: {
        type: 'object',
        properties: {
          externalId,
          invoiceId: { type: 'string', description: 'Id of the invoice.' },
        },
        required: ['externalId', 'invoiceId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      run: async (args) => {
        const result = await subscriptions.getInvoice({
          externalId: requiredString(args, 'externalId'),
          invoiceId: requiredString(args, 'invoiceId'),
        });

        return result
          ? { invoice: result.invoice }
          : { invoice: null, note: 'No such invoice for this customer' };
      },
    },
    {
      name: 'change_plan',
      title: 'Change plan',
      description:
        "Move a customer's subscription to another plan or interval. Upgrades take effect now with a prorated charge (or invoice); downgrades are scheduled for the end of the period. Confirm with the user first.",
      inputSchema: {
        type: 'object',
        properties: {
          externalId,
          planId: { type: 'string', description: 'Id from list_plans.' },
          interval: { type: 'string', enum: INTERVALS },
        },
        required: ['externalId', 'planId', 'interval'],
        additionalProperties: false,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: true,
      },
      run: (args) =>
        subscriptions.changePlan({
          externalId: requiredString(args, 'externalId'),
          planId: requiredString(args, 'planId'),
          interval: requiredOneOf(args, 'interval', INTERVALS),
        }),
    },
    {
      name: 'cancel_subscription',
      title: 'Cancel subscription',
      description:
        'Cancel at the end of the paid period (default; resume_subscription undoes it) or immediately (ends now, no refund). Confirm with the user first.',
      inputSchema: {
        type: 'object',
        properties: {
          externalId,
          immediately: {
            type: 'boolean',
            description: 'End now instead of at the period end.',
          },
        },
        required: ['externalId'],
        additionalProperties: false,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
      },
      run: async (args) => {
        await subscriptions.cancel({
          externalId: requiredString(args, 'externalId'),
          immediately: optionalBoolean(args, 'immediately') ?? false,
        });

        return { success: true };
      },
    },
    {
      name: 'resume_subscription',
      title: 'Resume subscription',
      description:
        'Undo a cancellation at the period end while the period is still running.',
      inputSchema: {
        type: 'object',
        properties: { externalId },
        required: ['externalId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, idempotentHint: true },
      run: async (args) => {
        await subscriptions.resume({
          externalId: requiredString(args, 'externalId'),
        });

        return { success: true };
      },
    },
    {
      name: 'switch_to_invoice',
      title: 'Switch to invoice',
      description:
        'From the next period on, bill this customer by invoice (QR-bill, payable within the due days) instead of charging the card / TWINT.',
      inputSchema: {
        type: 'object',
        properties: { externalId },
        required: ['externalId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, idempotentHint: true },
      run: async (args) => {
        await subscriptions.switchToInvoice({
          externalId: requiredString(args, 'externalId'),
        });

        return { success: true };
      },
    },
    {
      name: 'mark_invoice_paid',
      title: 'Mark invoice paid',
      description:
        'Record a payment that arrived outside the provider, e.g. a bank transfer: marks the invoice paid, sends the receipt and unlocks the subscription like any payment.',
      inputSchema: {
        type: 'object',
        properties: {
          invoiceId: { type: 'string' },
          transactionId: {
            type: 'string',
            description: 'Your reference of the payment (optional).',
          },
        },
        required: ['invoiceId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, idempotentHint: true },
      run: async (args) => ({
        invoice: await subscriptions.markInvoicePaid({
          invoiceId: requiredString(args, 'invoiceId'),
          transactionId: optionalString(args, 'transactionId'),
        }),
      }),
    },
    {
      name: 'void_invoice',
      title: 'Void invoice',
      description:
        'Cancel an open or written-off invoice so it is no longer owed. Cannot be undone. Confirm with the user first.',
      inputSchema: {
        type: 'object',
        properties: { invoiceId: { type: 'string' } },
        required: ['invoiceId'],
        additionalProperties: false,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
      },
      run: async (args) => {
        const invoice = await subscriptions.voidInvoice({
          invoiceId: requiredString(args, 'invoiceId'),
        });

        return invoice
          ? { invoice }
          : {
              invoice: null,
              note: 'No open or written-off invoice with this id',
            };
      },
    },
  ];
}

/** Without the provider token. */
function paymentMethodView(method: PaymentMethod | null) {
  return method
    ? {
        brand: method.brand,
        last4: method.last4,
        expiry: method.expiry,
        provider: method.provider,
      }
    : null;
}
