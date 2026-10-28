'use client';

import { useEffect, useState } from 'react';

import { interpolate } from '../../i18n';
import type { Address } from '../../types';
import { HsSoftOrderHint, HsSoftOrderPanel } from './hssoft';
import { useShopAdmin } from './provider';
import { SwissPostOrderPanel } from './swisspost';
import type { AdminOrder, AdminOrderQuery } from './types';
import {
  Badge,
  Check,
  FeedbackText,
  Field,
  Pending,
  type Tone,
  cx,
  fromDateInput,
  parseMoney,
  percent,
  useAction,
  useLoad,
} from './ui';

type Filter = 'all' | 'unpaid' | 'toShip' | 'shipped' | 'closed';

const FILTERS: Record<Filter, AdminOrderQuery> = {
  all: {},
  unpaid: { status: ['pending', 'confirmed'], paymentStatus: ['unpaid'] },
  toShip: { status: ['confirmed'], fulfillmentStatus: ['unfulfilled'] },
  shipped: { fulfillmentStatus: ['shipped'] },
  closed: { status: ['canceled', 'expired'] },
};

/** `2026-10-15` (a Zurich calendar day) as a `Date` that formats to it. */
function calendarDay(day: string) {
  return `${day}T12:00:00Z`;
}

/** `15.10.2026, 07:00–09:00` – the pickup / delivery day of the order. */
function fulfillmentDay(order: AdminOrder, date: (value: string) => string) {
  if (!order.fulfillmentDate) return null;

  return [date(calendarDay(order.fulfillmentDate)), order.fulfillmentWindow]
    .filter(Boolean)
    .join(', ');
}

function customerName(order: AdminOrder) {
  return (
    order.billingAddress?.name ?? order.shippingAddress?.name ?? order.email
  );
}

/** Payment state, or the order state while it is not confirmed. */
function PaymentBadge(props: { order: AdminOrder }) {
  const { m } = useShopAdmin();
  const { order } = props;

  if (order.status !== 'confirmed') {
    return (
      <Badge tone={order.status === 'pending' ? 'warning' : 'neutral'}>
        {m.orderStatus[order.status]}
      </Badge>
    );
  }

  const tone: Tone =
    order.paymentStatus === 'paid'
      ? 'success'
      : order.paymentStatus === 'unpaid'
        ? 'warning'
        : 'neutral';

  return <Badge tone={tone}>{m.paymentStatus[order.paymentStatus]}</Badge>;
}

function FulfillmentBadge(props: { order: AdminOrder }) {
  const { m } = useShopAdmin();
  const { order } = props;
  const status = order.fulfillmentStatus;
  const tone: Tone =
    status === 'delivered'
      ? 'success'
      : status === 'unfulfilled' && order.status === 'confirmed'
        ? 'warning'
        : 'neutral';
  const label =
    order.shipping?.pickup && status === 'shipped'
      ? m.order.actions.ready
      : m.fulfillmentStatus[status];

  return <Badge tone={tone}>{label}</Badge>;
}

export type AdminOrdersProps = {
  /** Orders per page (default 50). */
  pageSize?: number;
  /** Opens this order first (e.g. from the link in the merchant email). */
  initialOrderId?: string | null;
  /** After every change (paid, shipped, refunded …). */
  onChange?: () => void;
  className?: string;
};

/** Orders: filters, search by number or email, detail with every action. */
export function AdminOrders(props: AdminOrdersProps) {
  const { client, m, money, date, hssoft } = useShopAdmin();
  const pageSize = props.pageSize ?? 50;
  const [selected, setSelected] = useState<string | null>(
    props.initialOrderId ?? null,
  );
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [day, setDay] = useState('');
  const [more, setMore] = useState<AdminOrder[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const t = m.orders;

  const fetchPage = (offset: number) => {
    const term = query.trim();

    return client.orders({
      ...FILTERS[filter],
      ...(term.includes('@') ? { email: term } : term ? { number: term } : {}),
      ...(day ? { fulfillmentDate: day } : {}),
      limit: pageSize,
      offset,
    });
  };

  const { data, error, reload } = useLoad(async () => {
    const page = await fetchPage(0);

    setMore([]);
    setHasMore(page.length === pageSize);

    return page;
  }, [client, filter, query, day, pageSize]);

  if (selected) {
    return (
      <AdminOrderDetail
        className={props.className}
        orderId={selected}
        onBack={() => {
          setSelected(null);
          reload();
        }}
        onChange={props.onChange}
      />
    );
  }

  const orders = data ? [...data, ...more] : null;

  return (
    <div className={cx('sk-root sk-admin-orders', props.className)}>
      <div className="sk-toolbar">
        <div className="sk-filters" role="group">
          {(Object.keys(FILTERS) as Filter[]).map((key) => (
            <button
              key={key}
              type="button"
              className="sk-button sk-button-small"
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
            >
              {t.filters[key]}
            </button>
          ))}
        </div>
        <form
          className="sk-inline"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            setQuery(search);
          }}
        >
          <input
            className="sk-input"
            type="search"
            placeholder={t.search}
            aria-label={t.search}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              if (!event.target.value) setQuery('');
            }}
          />
          <button type="submit" className="sk-button">
            {m.common.search}
          </button>
        </form>
        <label className="sk-inline sk-day">
          <span className="sk-muted">{t.day}</span>
          <input
            className="sk-input"
            type="date"
            value={day}
            onChange={(event) => setDay(event.target.value)}
          />
        </label>
      </div>

      {!orders ? (
        <Pending error={error} />
      ) : orders.length === 0 ? (
        <p className="sk-muted">{t.empty}</p>
      ) : (
        <div className="sk-table-wrap">
          <table className="sk-table">
            <thead>
              <tr>
                <th>{t.number}</th>
                <th>{t.date}</th>
                <th>{t.customer}</th>
                <th className="sk-num">{t.total}</th>
                <th>{t.payment}</th>
                <th>{t.fulfillment}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="sk-row-link"
                  onClick={() => setSelected(order.id)}
                >
                  <td>
                    <button
                      type="button"
                      className="sk-link sk-mono"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelected(order.id);
                      }}
                    >
                      {order.number}
                    </button>
                  </td>
                  <td>{date(order.createdAt)}</td>
                  <td>
                    <div>{customerName(order)}</div>
                    {customerName(order) !== order.email ? (
                      <div className="sk-muted">{order.email}</div>
                    ) : null}
                  </td>
                  <td className="sk-num">
                    {money(order.total, order.currency)}
                  </td>
                  <td>
                    <PaymentBadge order={order} />
                  </td>
                  <td>
                    <FulfillmentBadge order={order} />
                    {order.fulfillmentDate ? (
                      <div className="sk-muted">
                        {fulfillmentDay(order, date)}
                      </div>
                    ) : null}
                    {hssoft ? <HsSoftOrderHint order={order} /> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {orders && hasMore ? (
        <button
          type="button"
          className="sk-button sk-align-start"
          onClick={() =>
            void fetchPage(orders.length).then((page) => {
              setMore((current) => [...current, ...page]);
              setHasMore(page.length === pageSize);
            })
          }
        >
          {m.common.loadMore}
        </button>
      ) : null}
    </div>
  );
}

function AddressBlock(props: { address: Address }) {
  const { address } = props;
  const country = address.country && address.country !== 'CH';

  return (
    <address className="sk-address-block">
      <div>{address.name}</div>
      {address.company ? <div>{address.company}</div> : null}
      <div>{address.line1}</div>
      {address.line2 ? <div>{address.line2}</div> : null}
      <div>
        {country ? `${address.country}-` : ''}
        {address.postalCode} {address.city}
      </div>
      {address.phone ? <div className="sk-muted">{address.phone}</div> : null}
    </address>
  );
}

function Row(props: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt>{props.label}</dt>
      <dd>{props.children}</dd>
    </>
  );
}

function OrderTotals(props: { order: AdminOrder }) {
  const { m, money } = useShopAdmin();
  const { order } = props;
  const t = m.totals;
  const format = (amount: number) => money(amount, order.currency);
  const taxed = order.taxLines.filter((line) => line.tax > 0);
  const vat = (included: boolean) =>
    taxed.map((line) => (
      <div
        key={`vat-${line.rateBps}`}
        className={cx('sk-totals-row', included && 'sk-muted')}
      >
        <dt>
          {interpolate(included ? t.vatIncluded : t.vat, {
            rate: (line.rateBps / 100).toFixed(1),
          })}
        </dt>
        <dd>{format(line.tax)}</dd>
      </div>
    ));
  const row = (label: string, amount: string, className?: string) => (
    <div className={cx('sk-totals-row', className)}>
      <dt>{label}</dt>
      <dd>{amount}</dd>
    </div>
  );

  return (
    <dl className="sk-totals">
      {row(t.subtotal, format(order.itemsSubtotal))}
      {order.discountTotal > 0
        ? row(
            interpolate(t.discount, { code: order.discountCode ?? '' }),
            `– ${format(order.discountTotal)}`,
          )
        : null}
      {order.shipping ? row(t.shipping, format(order.shippingTotal)) : null}
      {!order.taxInclusive ? vat(false) : null}
      {order.rounding !== 0 ? row(t.rounding, format(order.rounding)) : null}
      {row(t.total, format(order.total), 'sk-total')}
      {order.taxInclusive ? vat(true) : null}
      {order.giftCardTotal > 0
        ? row(t.giftCards, `– ${format(order.giftCardTotal)}`)
        : null}
      {order.giftCardTotal > 0
        ? row(t.amountDue, format(order.amountDue), 'sk-total')
        : null}
      {order.refundedTotal > 0
        ? row(t.refunded, `– ${format(order.refundedTotal)}`)
        : null}
    </dl>
  );
}

type Action = 'markPaid' | 'ship' | 'deliver' | 'cancel' | 'refund';

export type AdminOrderDetailProps = {
  orderId: string;
  /** Shows a back button. */
  onBack?: () => void;
  onChange?: () => void;
  className?: string;
};

/** One order: customer, items, totals, payment, shipping and the actions. */
export function AdminOrderDetail(props: AdminOrderDetailProps) {
  const {
    client,
    m,
    money,
    date,
    dateTime,
    openHtml,
    locale,
    hssoft,
    swisspost,
  } = useShopAdmin();
  const {
    data: order,
    setData,
    error,
    reload,
  } = useLoad(() => client.order(props.orderId), [client, props.orderId]);
  const { busy, feedback, run } = useAction();
  const [open, setOpen] = useState<Action | null>(null);
  const [reference, setReference] = useState('');
  const [paidAt, setPaidAt] = useState('');
  const [carrier, setCarrier] = useState('Die Post');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [reason, setReason] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [restock, setRestock] = useState(false);
  const t = m.order;

  useEffect(() => {
    if (!order) return;

    setCarrier(order.carrier ?? 'Die Post');
    setTrackingNumber(order.trackingNumber ?? '');
    setTrackingUrl(order.trackingUrl ?? '');
  }, [order]);

  const back = props.onBack ? (
    <button
      type="button"
      className="sk-button sk-button-ghost sk-align-start"
      onClick={props.onBack}
    >
      ← {m.common.back}
    </button>
  ) : null;

  if (!order) {
    return (
      <div className={cx('sk-root sk-admin-order', props.className)}>
        {back}
        <Pending error={error} />
      </div>
    );
  }

  const pickup = order.shipping?.pickup === true;
  const live = order.status === 'pending' || order.status === 'confirmed';
  const paid =
    order.paymentStatus === 'paid' ||
    order.paymentStatus === 'partially_refunded';
  const can: Record<Action, boolean> = {
    markPaid: live && order.paymentStatus === 'unpaid',
    ship:
      order.status === 'confirmed' &&
      (order.fulfillmentStatus === 'unfulfilled' ||
        // a shipped parcel: correct the tracking number
        (!pickup && order.fulfillmentStatus === 'shipped')),
    deliver:
      order.status === 'confirmed' &&
      (order.fulfillmentStatus === 'shipped' ||
        (pickup && order.fulfillmentStatus === 'unfulfilled')),
    cancel:
      live &&
      (order.fulfillmentStatus === 'unfulfilled' ||
        order.fulfillmentStatus === 'not_required'),
    refund: paid,
  };
  const labels: Record<Action, string> = {
    markPaid: t.actions.markPaid,
    ship: pickup ? t.actions.ready : t.actions.ship,
    deliver: pickup ? t.actions.pickedUp : t.actions.deliver,
    cancel: t.actions.cancel,
    refund: t.actions.refund,
  };
  const refundable = order.total - order.refundedTotal;
  const format = (amount: number) => money(amount, order.currency);

  const submit = async (action: Action) => {
    const result = await run<AdminOrder>(
      async () => {
        switch (action) {
          case 'markPaid':
            return client.markPaid(order.id, {
              reference: reference.trim() || null,
              paidAt: fromDateInput(paidAt),
            });
          case 'ship':
            return client.ship(
              order.id,
              pickup
                ? {}
                : {
                    carrier: carrier.trim() || null,
                    trackingNumber: trackingNumber.trim() || null,
                    trackingUrl: trackingUrl.trim() || null,
                  },
            );
          case 'deliver':
            return client.deliver(order.id);
          case 'cancel':
            return client.cancel(order.id, { reason: reason.trim() || null });
          case 'refund': {
            const amount = parseMoney(refundAmount);
            const { order: next } = await client.refund(order.id, {
              ...(amount === null ? {} : { amount }),
              reason: reason.trim() || null,
              restock,
            });

            return next;
          }
        }
      },
      (next) =>
        action === 'refund'
          ? interpolate(t.done.refund, {
              amount: format(next.refundedTotal - order.refundedTotal),
            })
          : action === 'ship' && pickup
            ? t.done.ready
            : t.done[action],
    );

    if (result) {
      setData(result);
      setOpen(null);
      setReason('');
      setRefundAmount('');
      props.onChange?.();
    }
  };

  const form = (action: Action, fields: React.ReactNode) =>
    open === action ? (
      <form
        className="sk-form"
        onSubmit={(event) => {
          event.preventDefault();
          void submit(action);
        }}
      >
        {fields}
        <div className="sk-actions">
          <button
            type="button"
            className="sk-button sk-button-ghost"
            onClick={() => setOpen(null)}
          >
            {m.common.cancel}
          </button>
          <button
            type="submit"
            className="sk-button sk-button-primary"
            disabled={busy}
          >
            {labels[action]}
          </button>
        </div>
      </form>
    ) : null;

  return (
    <div className={cx('sk-root sk-admin-order', props.className)}>
      {back}

      <div className="sk-card-header">
        <div>
          <h2 className="sk-title">
            {interpolate(t.title, { number: order.number })}
          </h2>
          <p className="sk-muted">
            {interpolate(t.placedOn, { date: dateTime(order.createdAt) })}
          </p>
        </div>
        <div className="sk-inline">
          <PaymentBadge order={order} />
          <FulfillmentBadge order={order} />
        </div>
      </div>

      <div className="sk-actions sk-actions-start">
        <button
          type="button"
          className="sk-button"
          onClick={() => openHtml(() => client.receipt(order.id, locale))}
        >
          {t.actions.receipt}
        </button>
        {(Object.keys(can) as Action[])
          .filter((action) => can[action])
          .map((action) => (
            <button
              key={action}
              type="button"
              className="sk-button"
              aria-expanded={open === action}
              disabled={busy}
              onClick={() =>
                action === 'deliver' || (action === 'ship' && pickup)
                  ? void submit(action)
                  : setOpen(open === action ? null : action)
              }
            >
              {labels[action]}
            </button>
          ))}
      </div>

      {form(
        'markPaid',
        <div className="sk-grid">
          <Field label={t.forms.reference}>
            <input
              className="sk-input"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
            />
          </Field>
          <Field label={t.forms.paidAt}>
            <input
              className="sk-input"
              type="date"
              value={paidAt}
              onChange={(event) => setPaidAt(event.target.value)}
            />
          </Field>
        </div>,
      )}
      {form(
        'ship',
        <div className="sk-grid">
          <Field label={t.forms.carrier}>
            <input
              className="sk-input"
              value={carrier}
              onChange={(event) => setCarrier(event.target.value)}
            />
          </Field>
          <Field label={t.forms.trackingNumber}>
            <input
              className="sk-input"
              value={trackingNumber}
              onChange={(event) => setTrackingNumber(event.target.value)}
            />
          </Field>
          <Field label={t.forms.trackingUrl}>
            <input
              className="sk-input"
              type="url"
              value={trackingUrl}
              onChange={(event) => setTrackingUrl(event.target.value)}
            />
          </Field>
        </div>,
      )}
      {form(
        'cancel',
        <>
          <p>{t.forms.cancelConfirm}</p>
          {paid ? <p className="sk-notice">{t.forms.cancelPaid}</p> : null}
          <Field label={t.forms.reason}>
            <input
              className="sk-input"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </Field>
        </>,
      )}
      {form(
        'refund',
        <>
          <p className="sk-muted">
            {interpolate(t.forms.refundable, { amount: format(refundable) })}
          </p>
          <div className="sk-grid">
            <Field label={t.forms.refundAmount}>
              <input
                className="sk-input"
                inputMode="decimal"
                placeholder={(refundable / 100).toFixed(2)}
                value={refundAmount}
                onChange={(event) => setRefundAmount(event.target.value)}
              />
            </Field>
            <Field label={t.forms.reason}>
              <input
                className="sk-input"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </Field>
          </div>
          {order.reserved ? (
            <Check
              label={t.forms.restock}
              checked={restock}
              onChange={setRestock}
            />
          ) : null}
        </>,
      )}

      <FeedbackText feedback={feedback} />

      <div className="sk-panels">
        <section className="sk-panel">
          <h3 className="sk-heading">{t.customer}</h3>
          <dl className="sk-dl">
            <Row label={t.email}>
              <a href={`mailto:${order.email}`}>{order.email}</a>
            </Row>
            {order.customerExternalId ? (
              <Row label={t.customerId}>
                <span className="sk-mono">{order.customerExternalId}</span>
              </Row>
            ) : null}
            {order.shippingAddress ? (
              <Row label={t.shippingAddress}>
                <AddressBlock address={order.shippingAddress} />
              </Row>
            ) : null}
            <Row label={t.billingAddress}>
              {order.billingAddress ? (
                <AddressBlock address={order.billingAddress} />
              ) : order.shippingAddress ? (
                t.sameAsShipping
              ) : (
                m.common.none
              )}
            </Row>
          </dl>
        </section>

        <section className="sk-panel">
          <h3 className="sk-heading">{t.payment}</h3>
          <dl className="sk-dl">
            <Row label={t.method}>{m.paymentMethod[order.paymentMethod]}</Row>
            {order.paidAt ? (
              <Row label={t.paidAt}>{dateTime(order.paidAt)}</Row>
            ) : null}
            {order.paidVia ? (
              <Row label={t.paidVia}>
                {order.paidVia === 'provider'
                  ? t.paidViaProvider
                  : t.paidViaManual}
              </Row>
            ) : null}
            {order.paymentReference ? (
              <Row label={t.reference}>{order.paymentReference}</Row>
            ) : null}
            {order.providerTransactionId ? (
              <Row label={t.transaction}>
                <span className="sk-mono">{order.providerTransactionId}</span>
              </Row>
            ) : null}
            {order.paymentStatus === 'unpaid' && order.dueAt ? (
              <Row label={t.dueAt}>{date(order.dueAt)}</Row>
            ) : null}
            {order.status === 'pending' && order.expiresAt ? (
              <Row label={t.expiresAt}>{dateTime(order.expiresAt)}</Row>
            ) : null}
            {order.remindersSent > 0 ? (
              <Row label={t.reminders}>{order.remindersSent}</Row>
            ) : null}
            {order.giftCards.map((card) => (
              <Row
                key={card.giftCardId}
                label={interpolate(t.giftCard, { last4: card.last4 })}
              >
                {format(card.amount)}
              </Row>
            ))}
          </dl>
        </section>

        {order.shipping || order.fulfillmentStatus !== 'not_required' ? (
          <section className="sk-panel">
            <h3 className="sk-heading">{t.shipping}</h3>
            <dl className="sk-dl">
              {order.shipping ? (
                <Row label={t.shippingMethod}>{order.shipping.name}</Row>
              ) : null}
              {order.fulfillmentDate ? (
                <Row label={t.fulfillmentDay}>
                  {fulfillmentDay(order, date)}
                </Row>
              ) : null}
              {order.carrier ? (
                <Row label={t.carrier}>{order.carrier}</Row>
              ) : null}
              {order.trackingNumber ? (
                <Row label={t.trackingNumber}>
                  {order.trackingUrl ? (
                    <a
                      href={order.trackingUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {order.trackingNumber}
                    </a>
                  ) : (
                    order.trackingNumber
                  )}
                </Row>
              ) : null}
              {order.shippedAt ? (
                <Row label={t.shippedAt}>{dateTime(order.shippedAt)}</Row>
              ) : null}
              {order.deliveredAt ? (
                <Row label={t.deliveredAt}>{dateTime(order.deliveredAt)}</Row>
              ) : null}
            </dl>
          </section>
        ) : null}

        {hssoft ? (
          <HsSoftOrderPanel
            order={order}
            onSynced={(sync) =>
              setData({
                ...order,
                metadata: { ...order.metadata, hssoft: sync },
              })
            }
          />
        ) : null}

        {swisspost ? (
          <SwissPostOrderPanel order={order} onCreated={reload} />
        ) : null}
      </div>

      {order.canceledAt ? (
        <p className="sk-notice">
          {t.canceledAt} {dateTime(order.canceledAt)}
          {order.cancelReason
            ? ` – ${t.cancelReason}: ${order.cancelReason}`
            : ''}
        </p>
      ) : null}

      {order.note ? (
        <section className="sk-section">
          <h3 className="sk-heading">{t.note}</h3>
          <p className="sk-pre">{order.note}</p>
        </section>
      ) : null}

      <section className="sk-section">
        <h3 className="sk-heading">{t.items}</h3>
        <div className="sk-table-wrap">
          <table className="sk-table">
            <thead>
              <tr>
                <th>{t.sku}</th>
                <th>{m.products.product}</th>
                <th className="sk-num">{t.quantity}</th>
                <th className="sk-num">{t.unitPrice}</th>
                <th className="sk-num">{t.vat}</th>
                <th className="sk-num">{t.amount}</th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((line) => (
                <tr key={line.variantId}>
                  <td className="sk-mono">{line.sku}</td>
                  <td>
                    <div>{line.productName}</div>
                    {line.variantName ? (
                      <div className="sk-muted">{line.variantName}</div>
                    ) : null}
                  </td>
                  <td className="sk-num">{line.quantity}</td>
                  <td className="sk-num">{format(line.unitPrice)}</td>
                  <td className="sk-num">{percent(line.taxRateBps)}</td>
                  <td className="sk-num">
                    {line.discount > 0 ? (
                      <s className="sk-muted">{format(line.subtotal)} </s>
                    ) : null}
                    {format(line.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <OrderTotals order={order} />
      </section>

      {order.refunds.length > 0 ? (
        <section className="sk-section">
          <h3 className="sk-heading">{t.refunds}</h3>
          <ul className="sk-lines">
            {order.refunds.map((refund) => (
              <li key={refund.id} className="sk-line">
                <div className="sk-line-main">
                  <div className="sk-line-name">{format(refund.amount)}</div>
                  <div className="sk-muted">
                    {dateTime(refund.createdAt)} ·{' '}
                    {interpolate(t.refundTo, {
                      payment: format(refund.toPayment),
                      giftCards: format(refund.toGiftCards),
                    })}
                    {refund.reason ? ` · ${refund.reason}` : ''}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
