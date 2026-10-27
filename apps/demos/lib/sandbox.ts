/**
 * The visitor's sandbox: tables of the memory adapter, sent emails, events
 * and a movable clock – all in localStorage, so a reload or the simulated
 * payment page (a real page navigation) keeps the state.
 */

export type SentEmail = {
  id: string;
  to: string;
  subject: string;
  html: string;
  at: string;
};

export type LoggedEvent = {
  id: string;
  type: string;
  at: string;
  data: unknown;
};

export type SandboxState = {
  /** Milliseconds the demo clock runs ahead of the real one. */
  offset: number;
  emails: SentEmail[];
  events: LoggedEvent[];
  /** Demo switches (e.g. "the card is declined"). */
  flags: Record<string, boolean>;
};

const DATE = '$date';

function replacer(this: Record<string, unknown>, key: string, value: unknown) {
  // `this[key]` is the raw value: a Date before its toJSON()
  const raw = this[key];

  return raw instanceof Date ? { [DATE]: raw.toISOString() } : value;
}

function reviver(_key: string, value: unknown) {
  if (
    value !== null &&
    typeof value === 'object' &&
    DATE in value &&
    Object.keys(value).length === 1
  ) {
    return new Date((value as Record<string, string>)[DATE]!);
  }

  return value;
}

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);

    return raw ? (JSON.parse(raw, reviver) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value, replacer));
  } catch {
    // storage full or blocked: the demo keeps working until the next reload
  }
}

type Listener = () => void;

export function createSandbox(name: string) {
  const tablesKey = `agentkit-demo:${name}:tables`;
  const stateKey = `agentkit-demo:${name}:state`;
  const listeners = new Set<Listener>();
  // bumped on every change, so React re-renders also when only tables changed
  let version = 0;
  const notify = () => {
    version += 1;
    for (const listener of listeners) listener();
  };

  let state: SandboxState = read<SandboxState>(stateKey) ?? {
    offset: 0,
    emails: [],
    events: [],
    flags: {},
  };

  const save = () => write(stateKey, state);

  const update = (change: (current: SandboxState) => SandboxState) => {
    state = change(state);
    save();
    notify();
  };

  return {
    /** Restores saved rows into the memory adapter's tables. */
    restoreTables(tables: Record<string, unknown[]>) {
      const saved = read<Record<string, unknown[]>>(tablesKey);

      if (!saved) return false;

      for (const [model, rows] of Object.entries(saved)) {
        tables[model]?.push(...rows);
      }

      return true;
    },
    saveTables(tables: Record<string, unknown[]>) {
      write(tablesKey, tables);
    },
    now: () => new Date(Date.now() + state.offset),
    get state() {
      return state;
    },
    getVersion: () => version,
    subscribe(listener: Listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    advance(ms: number) {
      update((current) => ({ ...current, offset: current.offset + ms }));
    },
    setFlag(flag: string, value: boolean) {
      update((current) => ({
        ...current,
        flags: { ...current.flags, [flag]: value },
      }));
    },
    logEmail(email: Omit<SentEmail, 'id' | 'at'>) {
      update((current) => ({
        ...current,
        emails: [
          {
            ...email,
            id: crypto.randomUUID(),
            at: new Date(Date.now() + current.offset).toISOString(),
          },
          ...current.emails,
        ].slice(0, 50),
      }));
    },
    logEvent(type: string, data: unknown) {
      update((current) => ({
        ...current,
        events: [
          {
            id: crypto.randomUUID(),
            type,
            at: new Date(Date.now() + current.offset).toISOString(),
            data: JSON.parse(JSON.stringify(data)) as unknown,
          },
          ...current.events,
        ].slice(0, 100),
      }));
    },
    /** Notifies the panels (after changes the sandbox does not see). */
    touch() {
      notify();
    },
    reset() {
      try {
        window.localStorage.removeItem(tablesKey);
        window.localStorage.removeItem(stateKey);
      } catch {
        // nothing stored
      }
    },
  };
}

export type Sandbox = ReturnType<typeof createSandbox>;

/**
 * Moves the clock like a real cron would see it: day by day, the job runs
 * after each step. Returns the summed summary.
 */
export async function advanceInSteps<T extends object>(
  sandbox: Sandbox,
  ms: number,
  runDue: () => Promise<T>,
) {
  const DAY = 24 * 60 * 60 * 1000;
  const total: Record<string, number | boolean> = {};
  let left = ms;

  while (left > 0) {
    const step = Math.min(left, DAY);

    sandbox.advance(step);
    left -= step;

    for (const [key, value] of Object.entries(await runDue())) {
      total[key] =
        typeof value === 'number'
          ? ((total[key] as number | undefined) ?? 0) + value
          : Boolean(total[key]) || Boolean(value);
    }
  }

  return total;
}

/** Opens HTML (receipt, invoice) in a new tab without a server. */
export function openHtml(target: Window | null, html: string) {
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));

  if (target) target.location.href = url;
  else window.open(url, '_blank');
}

/**
 * Links into the kit's API (receipts, invoices) cannot reach a server here:
 * clicks on them are answered by the in-browser handler instead.
 */
export function interceptApiLinks(
  prefix: string,
  handle: (url: string) => Promise<Response>,
) {
  const onClick = (event: MouseEvent) => {
    const anchor = (event.target as Element | null)?.closest?.('a');
    const href = anchor?.getAttribute('href');

    if (!anchor || !href?.startsWith(prefix)) return;

    event.preventDefault();

    // open synchronously (popup blockers), fill when the HTML is there
    const tab = window.open('', '_blank');

    void handle(new URL(href, window.location.origin).toString()).then(
      async (response) => openHtml(tab, await response.text()),
    );
  };

  document.addEventListener('click', onClick, true);

  return () => document.removeEventListener('click', onClick, true);
}
