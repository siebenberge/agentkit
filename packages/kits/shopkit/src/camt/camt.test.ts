import { describe, expect, it } from 'vitest';

import { createCamt054, mentionsNumber, parseAmount, parseCamt } from '.';
import { memoryAdapter } from '../adapters/memory';
import { createShop } from '../engine';
import { swissQrBill } from '../receipt/swiss-qr-bill';

const QR_IBAN = 'CH44 3199 9123 0008 8901 2';

/** camt.054 as a Swiss bank sends it: prefix, batch booking, debit, reversal. */
const CAMT_054 = `<?xml version="1.0" encoding="UTF-8"?>
<!-- exported by e-banking -->
<ns2:Document xmlns:ns2="urn:iso:std:iso:20022:tech:xsd:camt.054.001.08">
  <ns2:BkToCstmrDbtCdtNtfctn>
    <ns2:GrpHdr><ns2:MsgId>MSG-1</ns2:MsgId></ns2:GrpHdr>
    <ns2:Ntfctn>
      <ns2:Id>NTF-1</ns2:Id>
      <ns2:Acct><ns2:Id><ns2:IBAN>CH4431999123000889012</ns2:IBAN></ns2:Id></ns2:Acct>
      <ns2:Ntry>
        <ns2:Amt Ccy="CHF">350.50</ns2:Amt>
        <ns2:CdtDbtInd>CRDT</ns2:CdtDbtInd>
        <ns2:RvslInd>false</ns2:RvslInd>
        <ns2:Sts><ns2:Cd>BOOK</ns2:Cd></ns2:Sts>
        <ns2:BookgDt><ns2:Dt>2026-10-15</ns2:Dt></ns2:BookgDt>
        <ns2:ValDt><ns2:Dt>2026-10-16</ns2:Dt></ns2:ValDt>
        <ns2:AcctSvcrRef>ENTRY-1</ns2:AcctSvcrRef>
        <ns2:NtryDtls>
          <ns2:Btch><ns2:NbOfTxs>2</ns2:NbOfTxs></ns2:Btch>
          <ns2:TxDtls>
            <ns2:Refs><ns2:AcctSvcrRef>TX-1</ns2:AcctSvcrRef></ns2:Refs>
            <ns2:Amt Ccy="CHF">150.5</ns2:Amt>
            <ns2:CdtDbtInd>CRDT</ns2:CdtDbtInd>
            <ns2:RltdPties>
              <ns2:Dbtr><ns2:Pty><ns2:Nm>Anna Muster &amp; Co</ns2:Nm></ns2:Pty></ns2:Dbtr>
              <ns2:DbtrAcct><ns2:Id><ns2:IBAN>CH9300762011623852957</ns2:IBAN></ns2:Id></ns2:DbtrAcct>
            </ns2:RltdPties>
            <ns2:RmtInf>
              <ns2:Strd><ns2:CdtrRefInf>
                <ns2:Tp><ns2:CdOrPrtry><ns2:Prtry>QRR</ns2:Prtry></ns2:CdOrPrtry></ns2:Tp>
                <ns2:Ref>21 00000 00003 13947 14300 09017</ns2:Ref>
              </ns2:CdtrRefInf></ns2:Strd>
            </ns2:RmtInf>
          </ns2:TxDtls>
          <ns2:TxDtls>
            <ns2:Refs><ns2:AcctSvcrRef>TX-2</ns2:AcctSvcrRef></ns2:Refs>
            <ns2:AmtDtls><ns2:TxAmt><ns2:Amt Ccy="CHF">200.00</ns2:Amt></ns2:TxAmt></ns2:AmtDtls>
            <ns2:RmtInf><ns2:Ustrd>Rechnung INV-7 &lt;danke&gt;</ns2:Ustrd></ns2:RmtInf>
          </ns2:TxDtls>
        </ns2:NtryDtls>
      </ns2:Ntry>
      <ns2:Ntry>
        <ns2:Amt Ccy="CHF">20.00</ns2:Amt>
        <ns2:CdtDbtInd>DBIT</ns2:CdtDbtInd>
        <ns2:Sts><ns2:Cd>BOOK</ns2:Cd></ns2:Sts>
      </ns2:Ntry>
      <ns2:Ntry>
        <ns2:Amt Ccy="CHF">20.00</ns2:Amt>
        <ns2:CdtDbtInd>CRDT</ns2:CdtDbtInd>
        <ns2:RvslInd>true</ns2:RvslInd>
        <ns2:Sts><ns2:Cd>BOOK</ns2:Cd></ns2:Sts>
      </ns2:Ntry>
      <ns2:Ntry>
        <ns2:Amt Ccy="CHF">99.00</ns2:Amt>
        <ns2:CdtDbtInd>CRDT</ns2:CdtDbtInd>
        <ns2:Sts><ns2:Cd>PDNG</ns2:Cd></ns2:Sts>
      </ns2:Ntry>
    </ns2:Ntfctn>
  </ns2:BkToCstmrDbtCdtNtfctn>
</ns2:Document>`;

/** camt.053 statement, older version, plain status, single transaction. */
const CAMT_053 = `<?xml version="1.0"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.04">
  <BkToCstmrStmt>
    <Stmt>
      <Id>STMT-9</Id>
      <Acct><Id><IBAN>CH5604835012345678009</IBAN></Id></Acct>
      <Ntry>
        <Amt Ccy="EUR">10.00</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <Sts>BOOK</Sts>
        <BookgDt><DtTm>2026-10-01T08:30:00+02:00</DtTm></BookgDt>
        <NtryDtls><TxDtls>
          <RmtInf><Strd><CdtrRefInf><Ref>rf18 5390 0754 7034</Ref></CdtrRefInf></Strd></RmtInf>
        </TxDtls></NtryDtls>
      </Ntry>
      <Ntry>
        <Amt Ccy="CHF">5.00</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <Sts>BOOK</Sts>
        <AddtlNtryInf>Twint-Spende</AddtlNtryInf>
      </Ntry>
    </Stmt>
  </BkToCstmrStmt>
</Document>`;

describe('parseCamt', () => {
  it('reads the credits of a camt.054 batch booking', () => {
    expect(parseCamt(CAMT_054)).toEqual([
      {
        id: 'TX-1',
        amount: 15_050,
        currency: 'CHF',
        reference: '210000000003139471430009017',
        message: null,
        bookedAt: new Date('2026-10-15T12:00:00Z'),
        valueDate: new Date('2026-10-16T12:00:00Z'),
        debtorName: 'Anna Muster & Co',
        debtorIban: 'CH9300762011623852957',
        accountIban: 'CH4431999123000889012',
      },
      expect.objectContaining({
        id: 'TX-2',
        amount: 20_000,
        reference: null,
        message: 'Rechnung INV-7 <danke>',
        debtorName: null,
      }),
    ]);
  });

  it('reads a camt.053 statement and entries without details', () => {
    expect(parseCamt(CAMT_053)).toEqual([
      expect.objectContaining({
        id: 'STMT-9-1',
        amount: 1_000,
        currency: 'EUR',
        reference: 'RF18539007547034',
        bookedAt: new Date('2026-10-01T06:30:00Z'),
        accountIban: 'CH5604835012345678009',
      }),
      expect.objectContaining({
        id: 'STMT-9-2',
        amount: 500,
        reference: null,
        message: 'Twint-Spende',
      }),
    ]);
  });

  it('reads what createCamt054 writes', () => {
    const xml = createCamt054({
      accountIban: QR_IBAN,
      createdAt: new Date('2026-10-20T09:00:00Z'),
      payments: [
        {
          id: 'A1',
          amount: 1_990,
          currency: 'CHF',
          reference: '210000000003139471430009017',
          debtorName: 'Müller <AG>',
        },
        { id: 'A2', amount: 5, currency: 'CHF', message: 'INV-1' },
      ],
    });

    expect(parseCamt(xml)).toEqual([
      expect.objectContaining({
        id: 'A1',
        amount: 1_990,
        reference: '210000000003139471430009017',
        debtorName: 'Müller <AG>',
        accountIban: 'CH4431999123000889012',
        bookedAt: new Date('2026-10-20T12:00:00Z'),
      }),
      expect.objectContaining({ id: 'A2', amount: 5, message: 'INV-1' }),
    ]);
  });

  it('refuses something that is not a camt file', () => {
    expect(() => parseCamt('just text')).toThrow('Not a camt document');
  });

  it('parses amounts exactly', () => {
    expect(parseAmount('0.1')).toBe(10);
    expect(parseAmount('19.99')).toBe(1_999);
    expect(parseAmount('1234567.05')).toBe(123_456_705);
    expect(parseAmount('12,50')).toBeNull();
  });

  it('finds an invoice number as a whole word', () => {
    expect(mentionsNumber('Zahlung inv-7, danke', 'INV-7')).toBe(true);
    expect(mentionsNumber('INV-77', 'INV-7')).toBe(false);
    expect(mentionsNumber(null, 'INV-7')).toBe(false);
  });
});

describe('reconcileBankPayments', () => {
  async function setup() {
    let number = 0;
    const shop = createShop({
      database: memoryAdapter(),
      shipping: {
        rates: [{ id: 'pickup', name: 'Abholung', amount: 0, pickup: true }],
      },
      orders: { generateNumber: () => `B-${++number}` },
    });
    const product = await shop.createProduct({
      slug: 'kaffee',
      name: 'Kaffee',
      variants: [{ sku: 'KAF', price: 2_000, stock: 50 }],
    });
    const slip = swissQrBill({
      name: 'Rösterei AG',
      street: 'Weg 1',
      postalCode: '3000',
      city: 'Bern',
      iban: QR_IBAN,
    });
    const invoiceOrder = async (quantity = 1) => {
      const cart = await shop.createCart();

      await shop.addToCart(cart.token, {
        variantId: product.variants[0]!.id,
        quantity,
      });
      await shop.updateCartDetails(cart.token, {
        email: 'anna@example.ch',
        shippingRateId: 'pickup',
        billingAddress: {
          name: 'Anna Muster',
          line1: 'Bahnhofstrasse 1',
          postalCode: '8001',
          city: 'Zürich',
          country: 'CH',
        },
      });

      const result = await shop.checkout({
        token: cart.token,
        paymentMethod: 'invoice',
      });

      return (await shop.getOrder(result.order.id))!;
    };

    return { shop, slip, invoiceOrder };
  }

  it('marks invoice orders paid by QR reference and reports the rest', async () => {
    const { shop, slip, invoiceOrder } = await setup();
    const exact = await invoiceOrder();
    const under = await invoiceOrder(2);
    const byMessage = await invoiceOrder();
    const reference = (order: { number: string }) => slip.reference(order);

    const xml = createCamt054({
      accountIban: QR_IBAN,
      payments: [
        {
          id: 'P1',
          amount: 2_000,
          currency: 'CHF',
          reference: reference(exact),
        },
        {
          id: 'P2',
          amount: 2_000,
          currency: 'CHF',
          reference: reference(under),
        },
        {
          id: 'P3',
          amount: 2_500,
          currency: 'CHF',
          message: `Bestellung ${byMessage.number}`,
        },
        {
          id: 'P4',
          amount: 2_000,
          currency: 'CHF',
          reference: reference(exact),
        },
        { id: 'P5', amount: 100, currency: 'CHF' },
      ],
    });
    const result = await shop.reconcileBankPayments({
      payments: parseCamt(xml),
      reference,
    });

    expect(
      result.paid.map((entry) => [
        entry.payment.id,
        entry.order.number,
        entry.overpaidBy,
      ]),
    ).toEqual([
      ['P1', exact.number, 0],
      ['P3', byMessage.number, 500],
    ]);
    expect(result.paid[0]!.order).toMatchObject({
      paymentStatus: 'paid',
      paidVia: 'manual',
      paymentReference: 'bank:P1',
    });
    expect(result.underpaid).toEqual([
      expect.objectContaining({ missing: 2_000 }),
    ]);
    expect(result.alreadyPaid.map((entry) => entry.payment.id)).toEqual(['P4']);
    expect(result.unmatched).toEqual([
      expect.objectContaining({ reason: 'no_reference' }),
    ]);

    const again = await shop.reconcileBankPayments({
      payments: parseCamt(xml),
      reference,
    });

    expect(again.paid).toEqual([]);
    expect(again.alreadyPaid).toHaveLength(3);
  });
});
