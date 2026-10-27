'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import type { BillingOverviewDto, BillingSubscriptionDto } from '../http/types';
import {
  type MessageOverrides,
  type Messages,
  formatDate,
  formatMoney,
  formatNumber,
  getMessages,
  interpolate,
} from '../i18n';
import { grossAmount } from '../tax';
import type { BillingInterval, CollectionMethod, Plan } from '../types';
import {
  BillingApiError,
  type BillingClient,
  createBillingClient,
} from './client';
import { useBilling } from './use-billing';

export type BillingPortalProps = {
  /** A client, or `baseUrl` (+ `params`) to create one. */
  client?: BillingClient;
  baseUrl?: string;
  params?: Record<string, string>;
  locale?: string;
  messages?: MessageOverrides;
  /** Display name of a feature key of your plans. */
  featureLabel?: (feature: string) => string;
  /** Display text of a usage limit, `value` already formatted. */
  limitLabel?: (limit: string, value: string) => string;
  /** Hook into your app's toasts; default: inline notice. */
  onNotify?: (type: 'success' | 'error', message: string) => void;
  className?: string;
};

type Notice = { type: 'success' | 'error'; message: string } | null;

function yearly(amount: number, interval: BillingInterval) {
  return interval === 'year' ? amount : amount * 12;
}

function savingsPercent(plan: Plan) {
  const month = plan.prices.month?.amount;
  const year = plan.prices.year?.amount;

  if (!month || !year) return 0;

  return Math.max(0, Math.round((1 - year / (month * 12)) * 100));
}

/**
 * Complete self-service billing page: current plan, plan picker
 * (monthly / yearly), checkout with card / TWINT or invoice, payment
 * method, invoices, cancel / resume and dunning notices.
 *
 * Styling: import `@agentkit.ch/subkit/react/styles.css` and set the
 * `--sb-*` CSS variables to your design tokens.
 */
export function BillingPortal(props: BillingPortalProps) {
  const client = useMemo(
    () =>
      props.client ??
      createBillingClient({
        baseUrl: props.baseUrl ?? '/api/billing',
        params: props.params,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.client, props.baseUrl, JSON.stringify(props.params ?? {})],
  );

  const locale = props.locale;
  const m = useMemo(
    () => getMessages(locale, props.messages),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale, JSON.stringify(props.messages ?? {})],
  );
  const t = m.ui;

  const [checkoutState, setCheckoutState] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setCheckoutState(
      new URLSearchParams(window.location.search).get('checkout'),
    );
  }, []);

  const billing = useBilling(client, {
    awaitActivation: checkoutState === 'success',
  });
  const { data, subscription, pending } = billing;

  const [interval, setBillingInterval] = useState<BillingInterval>('year');
  const [notice, setNotice] = useState<Notice>(null);
  const [pendingPlan, setPendingPlan] = useState<Plan | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    if (subscription) setBillingInterval(subscription.interval);
  }, [subscription?.interval]); // eslint-disable-line react-hooks/exhaustive-deps

  const notify = (type: 'success' | 'error', message: string) => {
    if (props.onNotify) props.onNotify(type, message);
    else setNotice({ type, message });
  };

  const fail = (error: unknown) => {
    const code = error instanceof BillingApiError ? error.code : 'generic';
    const errors = t.errors as Record<string, string>;

    notify('error', errors[code] ?? t.errors.generic);
  };

  const action = async <T,>(
    name: string,
    fn: () => Promise<T>,
    onSuccess?: (result: T) => void,
  ) => {
    try {
      const result = await billing.run(name, fn);
      onSuccess?.(result);
    } catch (error) {
      fail(error);
    }
  };

  const redirect = (url: string) => window.location.assign(url);

  if (!data) {
    return (
      <div className={cx('sb-root', props.className)}>
        {billing.error ? (
          <Banner tone="danger" title={t.errors.generic} />
        ) : (
          <p className="sb-muted">{t.loading}</p>
        )}
      </div>
    );
  }

  const money = (amount: number, currency: string) =>
    formatMoney(amount, currency, locale);
  // what the customer pays: plan prices may be set without VAT
  const gross = (amount: number) => grossAmount(amount, data.tax);
  const date = (value: string) => formatDate(value, locale);
  const busy = pending !== null;
  const cardAvailable = data.collectionMethods.includes('charge_automatically');
  const invoiceAvailable = data.collectionMethods.includes('send_invoice');
  // a paused subscription keeps its plan; the entitlements fall back to free
  const currentPlan = data.plans.find(
    (plan) => plan.id === (subscription?.planId ?? data.entitlements.planId),
  );
  const overdue = data.invoices.find((invoice) => invoice.overdue);

  const closeCheckout = () => {
    setCheckoutState(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('checkout');
    window.history.replaceState(null, '', url.toString());
  };

  return (
    <div className={cx('sb-root', props.className)}>
      {notice ? (
        <Banner
          tone={notice.type === 'success' ? 'success' : 'danger'}
          title={notice.message}
          onClose={() => setNotice(null)}
          closeLabel={t.actions.close}
        />
      ) : null}

      {checkoutState ? (
        <CheckoutBanner
          state={checkoutState}
          activated={Boolean(subscription)}
          messages={m}
          onClose={closeCheckout}
        />
      ) : null}

      {data.collectionMethods.length === 0 ? (
        <Banner
          tone="warning"
          title={t.notConfigured.title}
          description={t.notConfigured.description}
        />
      ) : null}

      {subscription?.status === 'past_due' ||
      subscription?.status === 'unpaid' ? (
        <Banner
          tone="danger"
          title={
            subscription.status === 'unpaid'
              ? t.dunning.unpaidTitle
              : t.dunning.pastDueTitle
          }
          description={
            subscription.status === 'unpaid'
              ? t.dunning.unpaidDescription
              : t.dunning.pastDueDescription
          }
        >
          <div className="sb-actions">
            {cardAvailable ? (
              <button
                type="button"
                className="sb-button sb-button-primary"
                disabled={busy}
                onClick={() =>
                  void action(
                    'paymentMethod',
                    client.updatePaymentMethod,
                    (r) => redirect(r.url),
                  )
                }
              >
                {t.dunning.payWithCard}
              </button>
            ) : null}
            {overdue ? (
              <a
                className="sb-button"
                href={client.invoiceUrl(overdue.id)}
                target="_blank"
                rel="noreferrer"
              >
                {t.dunning.viewInvoice}
              </a>
            ) : null}
          </div>
        </Banner>
      ) : null}

      <section className="sb-card">
        <div className="sb-card-header">
          <h2 className="sb-title">
            {interpolate(t.current.title, { plan: currentPlan?.name ?? '' })}
          </h2>
          {subscription ? (
            <StatusBadge subscription={subscription} messages={m} />
          ) : (
            <span className="sb-badge">{t.status.free}</span>
          )}
        </div>
        <p className="sb-muted">
          {subscription
            ? interpolate(
                subscription.cancelAtPeriodEnd
                  ? t.current.endsOn
                  : subscription.status === 'trialing'
                    ? t.current.trialEndsOn
                    : t.current.renewsOn,
                {
                  date: date(subscription.currentPeriodEnd),
                  amount: money(
                    gross(subscription.unitAmount),
                    subscription.currency,
                  ),
                  interval: t.interval[subscription.interval],
                },
              )
            : t.current.freeDescription}
        </p>
        {subscription?.scheduledPlanId ? (
          <p className="sb-muted">
            {interpolate(t.current.scheduledChange, {
              plan:
                data.plans.find(
                  (plan) => plan.id === subscription.scheduledPlanId,
                )?.name ?? subscription.scheduledPlanId,
              interval:
                t.interval[
                  subscription.scheduledInterval ?? subscription.interval
                ],
              date: date(subscription.currentPeriodEnd),
            })}{' '}
            <button
              type="button"
              className="sb-button sb-button-ghost sb-button-small"
              disabled={busy}
              onClick={() =>
                void action(
                  'changePlan',
                  () =>
                    client.changePlan({
                      planId: subscription.planId,
                      interval: subscription.interval,
                    }),
                  () => notify('success', t.toasts.changeUndone),
                )
              }
            >
              {t.actions.keepPlan}
            </button>
          </p>
        ) : null}
        {subscription && subscription.status !== 'unpaid' ? (
          <div className="sb-actions">
            {subscription.cancelAtPeriodEnd ? (
              <button
                type="button"
                className="sb-button"
                disabled={busy}
                onClick={() =>
                  void action('resume', client.resume, () =>
                    notify('success', t.toasts.resumed),
                  )
                }
              >
                {t.actions.resume}
              </button>
            ) : (
              <button
                type="button"
                className="sb-button sb-button-ghost"
                onClick={() => setConfirmCancel(true)}
              >
                {t.actions.cancel}
              </button>
            )}
          </div>
        ) : null}
      </section>

      <section className="sb-section">
        <div className="sb-section-header">
          <div>
            <h2 className="sb-title">{t.plans.title}</h2>
            <p className="sb-muted">{t.plans.description}</p>
          </div>
          <div className="sb-toggle" role="radiogroup">
            {(['month', 'year'] as const).map((value) => {
              const savings = Math.max(0, ...data.plans.map(savingsPercent));

              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={interval === value}
                  className={cx(
                    'sb-toggle-item',
                    interval === value && 'sb-active',
                  )}
                  onClick={() => setBillingInterval(value)}
                >
                  {value === 'year'
                    ? t.interval.yearToggle
                    : t.interval.monthToggle}
                  {value === 'year' && savings > 0 ? (
                    <span className="sb-toggle-hint">
                      {interpolate(t.plans.save, { percent: savings })}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="sb-plans">
          {data.plans.map((plan) => {
            const price = plan.prices[interval];
            const isFree = Object.keys(plan.prices).length === 0;
            const current = subscription
              ? subscription.planId === plan.id &&
                subscription.interval === interval
              : plan.id === data.entitlements.planId;

            return (
              <article
                key={plan.id}
                className={cx('sb-card sb-plan', current && 'sb-plan-current')}
              >
                <div className="sb-card-header">
                  <h3 className="sb-plan-name">{plan.name}</h3>
                  {current ? (
                    <span className="sb-badge sb-badge-info">
                      {t.plans.current}
                    </span>
                  ) : null}
                </div>
                {plan.description ? (
                  <p className="sb-muted">{plan.description}</p>
                ) : null}
                <div className="sb-price">
                  <span className="sb-price-amount">
                    {money(gross(price?.amount ?? 0), price?.currency ?? 'CHF')}
                  </span>
                  <span className="sb-muted">
                    {' '}
                    {isFree
                      ? t.plans.forever
                      : interval === 'year'
                        ? t.plans.perYear
                        : t.plans.perMonth}
                  </span>
                  {interval === 'year' && price ? (
                    <div className="sb-small sb-muted">
                      {interpolate(t.plans.perMonthEquivalent, {
                        amount: money(
                          Math.round(gross(price.amount) / 12),
                          price.currency,
                        ),
                      })}
                    </div>
                  ) : null}
                  {!isFree &&
                  !current &&
                  plan.trialDays &&
                  data.trialEligible ? (
                    <div className="sb-trial">
                      {interpolate(t.plans.trial, { days: plan.trialDays })}
                    </div>
                  ) : null}
                </div>
                <ul className="sb-list">
                  {Object.entries(plan.limits).map(([key, value]) => {
                    const formatted =
                      value === null
                        ? t.limits.unlimited
                        : formatNumber(value, locale);

                    return (
                      <li key={key}>
                        {props.limitLabel
                          ? props.limitLabel(key, formatted)
                          : `${formatted} ${key}`}
                      </li>
                    );
                  })}
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      {props.featureLabel
                        ? props.featureLabel(feature)
                        : feature}
                    </li>
                  ))}
                </ul>
                {/* a hidden plan is only listed because the customer has it */}
                {!isFree && price && (!plan.hidden || current) ? (
                  <button
                    type="button"
                    className={cx(
                      'sb-button sb-block',
                      !current && 'sb-button-primary',
                    )}
                    disabled={
                      current || busy || data.collectionMethods.length === 0
                    }
                    onClick={() => setPendingPlan(plan)}
                  >
                    {current ? t.plans.current : t.plans.choose}
                  </button>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      {subscription ? (
        <section className="sb-card">
          <h2 className="sb-title">{t.paymentMethod.title}</h2>
          <p className="sb-muted">
            {subscription.collectionMethod === 'send_invoice'
              ? interpolate(t.paymentMethod.invoice, {
                  days: data.invoiceDueDays,
                })
              : data.paymentMethod
                ? interpolate(t.paymentMethod.card, {
                    brand:
                      data.paymentMethod.brand ?? t.paymentMethod.cardFallback,
                    last4: data.paymentMethod.last4 ?? '••••',
                    expiry: data.paymentMethod.expiry ?? '–',
                  })
                : t.paymentMethod.none}
          </p>
          <div className="sb-actions">
            {cardAvailable ? (
              <button
                type="button"
                className="sb-button"
                disabled={busy}
                onClick={() =>
                  void action(
                    'paymentMethod',
                    client.updatePaymentMethod,
                    (r) => redirect(r.url),
                  )
                }
              >
                {subscription.collectionMethod === 'send_invoice'
                  ? t.paymentMethod.switchToCard
                  : t.paymentMethod.update}
              </button>
            ) : null}
            {subscription.collectionMethod === 'charge_automatically' &&
            invoiceAvailable ? (
              <button
                type="button"
                className="sb-button sb-button-ghost"
                disabled={busy}
                onClick={() =>
                  void action('switchToInvoice', client.switchToInvoice, () =>
                    notify('success', t.toasts.invoiceCollection),
                  )
                }
              >
                {t.paymentMethod.switchToInvoice}
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="sb-card">
        <h2 className="sb-title">{t.invoices.title}</h2>
        <p className="sb-muted">{t.invoices.description}</p>
        {data.invoices.length === 0 ? (
          <p className="sb-muted">{t.invoices.empty}</p>
        ) : (
          <div className="sb-table-wrap">
            <table className="sb-table">
              <thead>
                <tr>
                  <th>{t.invoices.number}</th>
                  <th>{t.invoices.date}</th>
                  <th>{t.invoices.amount}</th>
                  <th>{t.invoices.status}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.invoices.map((invoice) => {
                  const isOverdue = invoice.overdue;

                  return (
                    <tr key={invoice.id}>
                      <td className="sb-strong">{invoice.number}</td>
                      <td>{date(invoice.createdAt)}</td>
                      <td>{money(invoice.total, invoice.currency)}</td>
                      <td>
                        <span
                          className={cx(
                            'sb-badge',
                            invoice.status === 'paid' && 'sb-badge-success',
                            invoice.status === 'open' &&
                              (isOverdue
                                ? 'sb-badge-danger'
                                : 'sb-badge-warning'),
                          )}
                        >
                          {isOverdue
                            ? t.invoiceStatus.overdue
                            : t.invoiceStatus[invoice.status]}
                        </span>
                      </td>
                      <td className="sb-row-actions">
                        {invoice.payable && cardAvailable ? (
                          <button
                            type="button"
                            className="sb-button sb-button-primary sb-button-small"
                            disabled={busy}
                            onClick={() =>
                              void action(
                                'payInvoice',
                                () => client.payInvoice(invoice.id),
                                (r) => redirect(r.url),
                              )
                            }
                          >
                            {t.invoices.payOnline}
                          </button>
                        ) : null}
                        <a
                          className="sb-button sb-button-small"
                          href={client.invoiceUrl(invoice.id)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {t.invoices.view}
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {pendingPlan && !subscription ? (
        <SubscribeDialog
          plan={pendingPlan}
          interval={interval}
          data={data}
          messages={m}
          locale={locale}
          pending={pending === 'subscribe'}
          onClose={() => setPendingPlan(null)}
          onConfirm={(collectionMethod) =>
            void action(
              'subscribe',
              () =>
                client.subscribe({
                  planId: pendingPlan.id,
                  interval,
                  collectionMethod,
                }),
              (result) => {
                if (result.type === 'redirect') return redirect(result.url);

                setPendingPlan(null);
                notify('success', t.toasts.subscribed);
              },
            )
          }
        />
      ) : null}

      {pendingPlan && subscription ? (
        <ChangePlanDialog
          plan={pendingPlan}
          interval={interval}
          subscription={subscription}
          tax={data.tax}
          messages={m}
          locale={locale}
          pending={pending === 'changePlan'}
          onClose={() => setPendingPlan(null)}
          onConfirm={() =>
            void action(
              'changePlan',
              () => client.changePlan({ planId: pendingPlan.id, interval }),
              (result) => {
                setPendingPlan(null);
                notify(
                  'success',
                  result.type === 'scheduled' && result.effectiveAt
                    ? interpolate(t.toasts.scheduled, {
                        date: date(result.effectiveAt),
                      })
                    : t.toasts.changed,
                );
              },
            )
          }
        />
      ) : null}

      {confirmCancel && subscription ? (
        <Dialog
          title={t.cancelDialog.title}
          description={interpolate(t.cancelDialog.description, {
            date: date(subscription.currentPeriodEnd),
          })}
          onClose={() => setConfirmCancel(false)}
          footer={
            <>
              <button
                type="button"
                className="sb-button sb-button-ghost"
                onClick={() => setConfirmCancel(false)}
              >
                {t.cancelDialog.keep}
              </button>
              <button
                type="button"
                className="sb-button sb-button-danger"
                disabled={busy}
                onClick={() =>
                  void action('cancel', client.cancel, () => {
                    setConfirmCancel(false);
                    notify('success', t.toasts.canceled);
                  })
                }
              >
                {t.cancelDialog.confirm}
              </button>
            </>
          }
        />
      ) : null}
    </div>
  );
}

function SubscribeDialog(props: {
  plan: Plan;
  interval: BillingInterval;
  data: BillingOverviewDto;
  messages: Messages;
  locale?: string;
  pending: boolean;
  onClose: () => void;
  onConfirm: (collectionMethod: CollectionMethod) => void;
}) {
  const t = props.messages.ui;
  const methods = props.data.collectionMethods;
  const [method, setMethod] = useState<CollectionMethod>(
    methods[0] ?? 'charge_automatically',
  );
  const price = props.plan.prices[props.interval];

  return (
    <Dialog
      title={interpolate(t.subscribeDialog.title, { plan: props.plan.name })}
      description={
        price
          ? interpolate(
              props.plan.trialDays && props.data.trialEligible
                ? t.subscribeDialog.trialDescription
                : t.subscribeDialog.description,
              {
                days: props.plan.trialDays ?? 0,
                amount: formatMoney(
                  grossAmount(price.amount, props.data.tax),
                  price.currency,
                  props.locale,
                ),
                interval: t.interval[props.interval],
              },
            )
          : undefined
      }
      onClose={props.onClose}
      footer={
        <>
          <button
            type="button"
            className="sb-button sb-button-ghost"
            onClick={props.onClose}
          >
            {t.actions.back}
          </button>
          <button
            type="button"
            className="sb-button sb-button-primary"
            disabled={props.pending}
            onClick={() => props.onConfirm(method)}
          >
            {method === 'charge_automatically'
              ? t.subscribeDialog.continueToPayment
              : t.subscribeDialog.subscribeWithInvoice}
          </button>
        </>
      }
    >
      <div className="sb-options" role="radiogroup">
        {methods.map((value) => (
          <label
            key={value}
            className={cx('sb-option', method === value && 'sb-active')}
          >
            <input
              type="radio"
              name="sb-collection-method"
              value={value}
              checked={method === value}
              onChange={() => setMethod(value)}
            />
            <span>
              <span className="sb-strong">
                {value === 'charge_automatically'
                  ? t.subscribeDialog.card
                  : t.subscribeDialog.invoice}
              </span>
              <span className="sb-muted sb-block">
                {value === 'charge_automatically'
                  ? t.subscribeDialog.cardDescription
                  : interpolate(t.subscribeDialog.invoiceDescription, {
                      days: props.data.invoiceDueDays,
                    })}
              </span>
            </span>
          </label>
        ))}
      </div>
      <p className="sb-small sb-muted">{t.subscribeDialog.terms}</p>
    </Dialog>
  );
}

function ChangePlanDialog(props: {
  plan: Plan;
  interval: BillingInterval;
  subscription: BillingSubscriptionDto;
  tax: BillingOverviewDto['tax'];
  messages: Messages;
  locale?: string;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const t = props.messages.ui;
  const price = props.plan.prices[props.interval];

  if (!price) return null;

  const { subscription } = props;
  const values = {
    amount: formatMoney(
      grossAmount(price.amount, props.tax),
      price.currency,
      props.locale,
    ),
    interval: t.interval[props.interval],
    date: formatDate(subscription.currentPeriodEnd, props.locale),
  };

  // mirrors the engine: upgrades apply now (prorated), the rest at period end
  const immediate =
    subscription.status === 'trialing' ||
    (yearly(price.amount, props.interval) >
      yearly(subscription.unitAmount, subscription.interval) &&
      !(subscription.interval === 'year' && props.interval === 'month'));

  const description = !immediate
    ? t.changeDialog.scheduled
    : subscription.status === 'trialing'
      ? t.changeDialog.trial
      : subscription.collectionMethod === 'send_invoice'
        ? t.changeDialog.upgradeInvoice
        : t.changeDialog.upgradeCard;

  return (
    <Dialog
      title={interpolate(t.changeDialog.title, { plan: props.plan.name })}
      description={interpolate(description, values)}
      onClose={props.onClose}
      footer={
        <>
          <button
            type="button"
            className="sb-button sb-button-ghost"
            onClick={props.onClose}
          >
            {t.actions.back}
          </button>
          <button
            type="button"
            className="sb-button sb-button-primary"
            disabled={props.pending}
            onClick={props.onConfirm}
          >
            {t.changeDialog.confirm}
          </button>
        </>
      }
    />
  );
}

function CheckoutBanner(props: {
  state: string;
  activated: boolean;
  messages: Messages;
  onClose: () => void;
}) {
  const t = props.messages.ui.checkout;

  if (props.state === 'success') {
    return (
      <Banner
        tone="success"
        title={props.activated ? t.successTitle : t.processingTitle}
        description={
          props.activated ? t.successDescription : t.processingDescription
        }
        onClose={props.onClose}
        closeLabel={props.messages.ui.actions.close}
      />
    );
  }

  return (
    <Banner
      tone="warning"
      title={props.state === 'failed' ? t.failedTitle : t.cancelTitle}
      description={
        props.state === 'failed' ? t.failedDescription : t.cancelDescription
      }
      onClose={props.onClose}
      closeLabel={props.messages.ui.actions.close}
    />
  );
}

function StatusBadge(props: {
  subscription: BillingSubscriptionDto;
  messages: Messages;
}) {
  const t = props.messages.ui.status;
  const { status, cancelAtPeriodEnd } = props.subscription;

  if (cancelAtPeriodEnd) {
    return <span className="sb-badge sb-badge-warning">{t.canceling}</span>;
  }

  const tone =
    status === 'active'
      ? 'sb-badge-success'
      : status === 'trialing'
        ? 'sb-badge-info'
        : status === 'past_due'
          ? 'sb-badge-warning'
          : 'sb-badge-danger';

  return <span className={cx('sb-badge', tone)}>{t[status]}</span>;
}

function Banner(props: {
  tone: 'success' | 'warning' | 'danger' | 'info';
  title: string;
  description?: string;
  onClose?: () => void;
  closeLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cx('sb-banner', `sb-banner-${props.tone}`)} role="status">
      <div className="sb-banner-body">
        <p className="sb-strong">{props.title}</p>
        {props.description ? <p>{props.description}</p> : null}
        {props.children}
      </div>
      {props.onClose ? (
        <button
          type="button"
          className="sb-button sb-button-ghost sb-button-small"
          onClick={props.onClose}
        >
          {props.closeLabel ?? '×'}
        </button>
      ) : null}
    </div>
  );
}

function Dialog(props: {
  title: string;
  description?: string;
  onClose: () => void;
  footer: React.ReactNode;
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;

    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className="sb-dialog"
      onClose={props.onClose}
      onCancel={(event) => {
        event.preventDefault();
        props.onClose();
      }}
    >
      <h2 className="sb-title">{props.title}</h2>
      {props.description ? (
        <p className="sb-muted">{props.description}</p>
      ) : null}
      {props.children}
      <div className="sb-dialog-footer">{props.footer}</div>
    </dialog>
  );
}

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
