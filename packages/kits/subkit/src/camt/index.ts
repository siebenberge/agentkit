/**
 * Bank files of Swiss banks (ISO 20022): camt.054 credit notifications and
 * camt.053 statements (camt.052 reports read the same way). `parseCamt()`
 * returns the incoming payments with their structured reference (QR or
 * creditor reference) – `subscriptions.reconcileBankPayments()` matches them
 * to open invoices.
 *
 * No dependency: a small XML reader for the well-formed files banks export.
 */

/** One incoming payment (credit) of a bank file. */
export type BankPayment = {
  /** Bank reference of the booking – unique per payment, for your records. */
  id: string;
  /** Rappen / cents. */
  amount: number;
  currency: string;
  /** QR reference (27 digits) or creditor reference (`RF…`), no spaces. */
  reference: string | null;
  /** Unstructured remittance information (free text of the payer). */
  message: string | null;
  bookedAt: Date | null;
  valueDate: Date | null;
  debtorName: string | null;
  debtorIban: string | null;
  /** IBAN / QR-IBAN of your account the payment went to. */
  accountIban: string | null;
};

type XmlNode = {
  /** Local name (namespace prefix dropped). */
  name: string;
  attributes: Record<string, string>;
  children: XmlNode[];
  text: string;
};

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

function decode(text: string) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (match, entity: string) => {
    if (entity.startsWith('#')) {
      const code =
        entity[1] === 'x' || entity[1] === 'X'
          ? parseInt(entity.slice(2), 16)
          : parseInt(entity.slice(1), 10);

      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }

    return ENTITIES[entity] ?? match;
  });
}

const localName = (name: string) => name.slice(name.indexOf(':') + 1);

/** Elements, attributes and text of a well-formed XML document. */
function parseXml(xml: string): XmlNode {
  const root: XmlNode = {
    name: '#root',
    attributes: {},
    children: [],
    text: '',
  };
  const stack = [root];
  const token =
    /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[([\s\S]*?)\]\]>|<!DOCTYPE[^>]*>|<(\/?)([\w:.-]+)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;

  for (const match of xml.matchAll(token)) {
    const [, cdata, closing, name, attributes, selfClosing, text] = match;
    const current = stack[stack.length - 1]!;

    if (cdata !== undefined) {
      current.text += cdata;
    } else if (text !== undefined) {
      current.text += decode(text);
    } else if (name) {
      if (closing) {
        if (stack.length > 1) stack.pop();
        continue;
      }

      const node: XmlNode = {
        name: localName(name),
        attributes: {},
        children: [],
        text: '',
      };

      for (const [, key, double, single] of (attributes ?? '').matchAll(
        /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g,
      )) {
        node.attributes[localName(key!)] = decode(double ?? single ?? '');
      }

      current.children.push(node);
      if (!selfClosing) stack.push(node);
    }
  }

  return root;
}

const child = (node: XmlNode | undefined, ...path: string[]) => {
  let current = node;

  for (const name of path) {
    current = current?.children.find((entry) => entry.name === name);
  }

  return current;
};

const childrenOf = (node: XmlNode | undefined, name: string) =>
  node?.children.filter((entry) => entry.name === name) ?? [];

const textOf = (node: XmlNode | undefined, ...path: string[]) => {
  const value = child(node, ...path)?.text.trim();

  return value ? value : null;
};

/** `"1234.5"` → 123450 (exact, no floating point). */
export function parseAmount(value: string) {
  const match = /^\s*(\d+)(?:\.(\d+))?\s*$/.exec(value);

  if (!match) return null;

  return (
    Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0').slice(0, 2))
  );
}

function parseDate(node: XmlNode | undefined) {
  const value = textOf(node, 'Dt') ?? textOf(node, 'DtTm');

  if (!value) return null;

  // a plain date is the booking day: noon UTC keeps it on that day in Switzerland
  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value,
  );

  return Number.isNaN(date.getTime()) ? null : date;
}

/** Structured reference without spaces, upper case. */
export function normalizeReference(value: string | null | undefined) {
  const reference = value?.replace(/\s+/g, '').toUpperCase();

  return reference ? reference : null;
}

function partyName(party: XmlNode | undefined) {
  return textOf(party, 'Nm') ?? textOf(party, 'Pty', 'Nm');
}

function amountOf(node: XmlNode | undefined) {
  const amount = child(node, 'Amt') ?? child(node, 'AmtDtls', 'TxAmt', 'Amt');

  if (!amount) return null;

  const value = parseAmount(amount.text);

  return value === null
    ? null
    : { amount: value, currency: (amount.attributes.Ccy ?? '').toUpperCase() };
}

/**
 * Incoming payments of a camt.053 / camt.054 file (any version). Debits,
 * reversals and bookings that are not final yet are left out; a batch
 * booking yields one payment per transaction.
 */
export function parseCamt(xml: string): BankPayment[] {
  const document = parseXml(xml);
  const message = child(document, 'Document')?.children[0];

  if (!message) throw new Error('Not a camt document');

  const payments: BankPayment[] = [];
  const containers = message.children.filter((node) =>
    ['Ntfctn', 'Stmt', 'Rpt'].includes(node.name),
  );

  for (const container of containers) {
    const accountIban = textOf(container, 'Acct', 'Id', 'IBAN');

    for (const [entryIndex, entry] of childrenOf(container, 'Ntry').entries()) {
      const status =
        textOf(entry, 'Sts', 'Cd') ?? textOf(entry, 'Sts') ?? 'BOOK';

      if (
        textOf(entry, 'CdtDbtInd') !== 'CRDT' ||
        textOf(entry, 'RvslInd') === 'true' ||
        status !== 'BOOK'
      ) {
        continue;
      }

      const entryRef =
        textOf(entry, 'AcctSvcrRef') ??
        `${textOf(container, 'Id') ?? 'camt'}-${entryIndex + 1}`;
      const bookedAt = parseDate(child(entry, 'BookgDt'));
      const valueDate = parseDate(child(entry, 'ValDt'));
      const transactions = childrenOf(entry, 'NtryDtls').flatMap((details) =>
        childrenOf(details, 'TxDtls'),
      );

      if (transactions.length === 0) {
        const amount = amountOf(entry);

        if (amount) {
          payments.push({
            id: entryRef,
            ...amount,
            reference: null,
            message: textOf(entry, 'AddtlNtryInf'),
            bookedAt,
            valueDate,
            debtorName: null,
            debtorIban: null,
            accountIban,
          });
        }

        continue;
      }

      for (const [index, transaction] of transactions.entries()) {
        if ((textOf(transaction, 'CdtDbtInd') ?? 'CRDT') !== 'CRDT') {
          continue;
        }

        // a single transaction may leave its amount to the entry
        const amount =
          amountOf(transaction) ??
          (transactions.length === 1 ? amountOf(entry) : null);

        if (!amount) continue;

        const remittance = child(transaction, 'RmtInf');
        const reference = normalizeReference(
          childrenOf(remittance, 'Strd')
            .map((structured) => textOf(structured, 'CdtrRefInf', 'Ref'))
            .find(Boolean),
        );
        const text = childrenOf(remittance, 'Ustrd')
          .map((node) => node.text.trim())
          .filter(Boolean)
          .join(' ');
        const parties = child(transaction, 'RltdPties');

        payments.push({
          id:
            textOf(transaction, 'Refs', 'AcctSvcrRef') ??
            (transactions.length === 1 ? entryRef : `${entryRef}-${index + 1}`),
          ...amount,
          reference,
          message: text || null,
          bookedAt,
          valueDate,
          debtorName:
            partyName(child(parties, 'Dbtr')) ??
            partyName(child(parties, 'UltmtDbtr')),
          debtorIban: textOf(parties, 'DbtrAcct', 'Id', 'IBAN'),
          accountIban,
        });
      }
    }
  }

  return payments;
}

/** Does `message` name the invoice / order `number` (as a whole word)? */
export function mentionsNumber(message: string | null, number: string) {
  if (!message) return false;

  const pattern = number.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  return new RegExp(`(^|[^A-Za-z0-9])${pattern}($|[^A-Za-z0-9])`, 'i').test(
    message,
  );
}

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const formatAmount = (amount: number) =>
  `${Math.floor(amount / 100)}.${String(amount % 100).padStart(2, '0')}`;

/**
 * A camt.054 credit notification (version 08, as Swiss banks send it) –
 * for tests, demos and trying the import without a bank.
 */
export function createCamt054(params: {
  accountIban: string;
  payments: (Pick<BankPayment, 'amount' | 'currency'> &
    Partial<
      Pick<BankPayment, 'id' | 'reference' | 'message' | 'debtorName'>
    > & {
      bookedAt?: Date;
    })[];
  createdAt?: Date;
}) {
  const created = params.createdAt ?? new Date();
  const day = (date: Date) => date.toISOString().slice(0, 10);
  const entries = params.payments
    .map((payment, index) => {
      const id = escapeXml(payment.id ?? `${created.getTime()}-${index + 1}`);
      const booked = day(payment.bookedAt ?? created);
      const amount = `<Amt Ccy="${escapeXml(payment.currency)}">${formatAmount(payment.amount)}</Amt>`;
      const reference = payment.reference
        ? `<Strd><CdtrRefInf><Tp><CdOrPrtry><Prtry>${payment.reference.startsWith('RF') ? 'SCOR' : 'QRR'}</Prtry></CdOrPrtry></Tp><Ref>${escapeXml(payment.reference)}</Ref></CdtrRefInf></Strd>`
        : '';
      const message = payment.message
        ? `<Ustrd>${escapeXml(payment.message)}</Ustrd>`
        : '';

      return `
      <Ntry>
        ${amount}
        <CdtDbtInd>CRDT</CdtDbtInd>
        <Sts><Cd>BOOK</Cd></Sts>
        <BookgDt><Dt>${booked}</Dt></BookgDt>
        <ValDt><Dt>${booked}</Dt></ValDt>
        <AcctSvcrRef>${id}</AcctSvcrRef>
        <BkTxCd><Domn><Cd>PMNT</Cd><Fmly><Cd>RCDT</Cd><SubFmlyCd>VCOM</SubFmlyCd></Fmly></Domn></BkTxCd>
        <NtryDtls><TxDtls>
          <Refs><AcctSvcrRef>${id}</AcctSvcrRef></Refs>
          ${amount}
          <CdtDbtInd>CRDT</CdtDbtInd>
          <RltdPties><Dbtr><Pty><Nm>${escapeXml(payment.debtorName ?? 'Unknown')}</Nm></Pty></Dbtr></RltdPties>
          <RmtInf>${message}${reference}</RmtInf>
        </TxDtls></NtryDtls>
      </Ntry>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.054.001.08">
  <BkToCstmrDbtCdtNtfctn>
    <GrpHdr><MsgId>${created.getTime()}</MsgId><CreDtTm>${created.toISOString()}</CreDtTm></GrpHdr>
    <Ntfctn>
      <Id>${created.getTime()}</Id>
      <CreDtTm>${created.toISOString()}</CreDtTm>
      <Acct><Id><IBAN>${escapeXml(params.accountIban.replace(/\s/g, ''))}</IBAN></Id></Acct>${entries}
    </Ntfctn>
  </BkToCstmrDbtCdtNtfctn>
</Document>
`;
}
