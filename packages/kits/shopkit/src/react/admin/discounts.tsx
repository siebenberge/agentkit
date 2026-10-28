'use client';

import { useState } from 'react';

import { interpolate } from '../../i18n';
import type { DiscountType } from '../../types';
import { useShopAdmin } from './provider';
import type { AdminDiscount, AdminDiscountInput } from './types';
import {
  Badge,
  Check,
  FeedbackText,
  Field,
  Pending,
  type Tone,
  cx,
  dateInput,
  fromDateInput,
  invalidInput,
  moneyInput,
  parseInteger,
  parseMoney,
  parsePercent,
  percent,
  useAction,
  useLoad,
} from './ui';

const TYPES: DiscountType[] = ['percent', 'fixed', 'free_shipping'];

type DiscountState =
  'active' | 'inactive' | 'scheduled' | 'ended' | 'exhausted';

function discountState(discount: AdminDiscount, now: number): DiscountState {
  if (!discount.active) return 'inactive';
  if (discount.startsAt && new Date(discount.startsAt).getTime() > now)
    return 'scheduled';
  if (discount.endsAt && new Date(discount.endsAt).getTime() < now)
    return 'ended';
  if (
    discount.usageLimit !== null &&
    discount.usageCount >= discount.usageLimit
  )
    return 'exhausted';

  return 'active';
}

const TONES: Record<DiscountState, Tone> = {
  active: 'success',
  inactive: 'neutral',
  scheduled: 'warning',
  ended: 'neutral',
  exhausted: 'neutral',
};

export type AdminDiscountsProps = {
  onChange?: () => void;
  className?: string;
};

/** Discount codes: percent, amount or free shipping, with limits. */
export function AdminDiscounts(props: AdminDiscountsProps) {
  const { client, m, money, date } = useShopAdmin();
  const [editing, setEditing] = useState<AdminDiscount | 'new' | null>(null);
  const {
    data: discounts,
    setData,
    error,
    reload,
  } = useLoad(() => client.discounts(), [client]);
  const { busy, feedback, run } = useAction();
  const t = m.discounts;
  const now = Date.now();

  if (editing) {
    return (
      <DiscountForm
        className={props.className}
        discount={editing === 'new' ? undefined : editing}
        onDone={() => {
          setEditing(null);
          reload();
          props.onChange?.();
        }}
        onCancel={() => setEditing(null)}
      />
    );
  }

  const toggle = async (discount: AdminDiscount) => {
    const next = await run(
      () => client.updateDiscount(discount.id, { active: !discount.active }),
      m.common.saved,
    );

    if (next && discounts) {
      setData(discounts.map((entry) => (entry.id === next.id ? next : entry)));
      props.onChange?.();
    }
  };

  const value = (discount: AdminDiscount) =>
    discount.type === 'percent'
      ? percent(discount.value)
      : discount.type === 'fixed'
        ? money(discount.value)
        : t.types.free_shipping;

  return (
    <div className={cx('sk-root sk-admin-discounts', props.className)}>
      <div className="sk-toolbar">
        <span />
        <button
          type="button"
          className="sk-button sk-button-primary"
          onClick={() => setEditing('new')}
        >
          {t.new}
        </button>
      </div>

      <FeedbackText feedback={feedback} />

      {!discounts ? (
        <Pending error={error} />
      ) : discounts.length === 0 ? (
        <p className="sk-muted">{t.empty}</p>
      ) : (
        <div className="sk-table-wrap">
          <table className="sk-table">
            <thead>
              <tr>
                <th>{t.code}</th>
                <th>{t.value}</th>
                <th>{t.minimum}</th>
                <th>{t.usage}</th>
                <th>{t.period}</th>
                <th>{m.products.status}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {discounts.map((discount) => {
                const state = discountState(discount, now);

                return (
                  <tr key={discount.id}>
                    <td>
                      <button
                        type="button"
                        className="sk-link sk-mono"
                        onClick={() => setEditing(discount)}
                      >
                        {discount.code}
                      </button>
                    </td>
                    <td>{value(discount)}</td>
                    <td>
                      {discount.minSubtotal === null
                        ? m.common.none
                        : money(discount.minSubtotal)}
                    </td>
                    <td>
                      {discount.usageLimit === null
                        ? discount.usageCount
                        : interpolate(t.usageOf, {
                            count: discount.usageCount,
                            limit: discount.usageLimit,
                          })}
                    </td>
                    <td>
                      {discount.startsAt || discount.endsAt
                        ? `${discount.startsAt ? date(discount.startsAt) : ''} – ${discount.endsAt ? date(discount.endsAt) : ''}`
                        : m.common.none}
                    </td>
                    <td>
                      <Badge tone={TONES[state]}>{t.state[state]}</Badge>
                    </td>
                    <td className="sk-num">
                      <button
                        type="button"
                        className="sk-button sk-button-small"
                        disabled={busy}
                        onClick={() => void toggle(discount)}
                      >
                        {discount.active ? t.deactivate : t.activate}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DiscountForm(props: {
  discount?: AdminDiscount;
  onDone: () => void;
  onCancel: () => void;
  className?: string;
}) {
  const { client, m, currency } = useShopAdmin();
  const { discount } = props;
  const { data: products } = useLoad(() => client.products(), [client]);
  const [code, setCode] = useState(discount?.code ?? '');
  const [type, setType] = useState<DiscountType>(discount?.type ?? 'percent');
  const [value, setValue] = useState(
    !discount
      ? ''
      : discount.type === 'percent'
        ? String(discount.value / 100)
        : discount.type === 'fixed'
          ? moneyInput(discount.value)
          : '',
  );
  const [minSubtotal, setMinSubtotal] = useState(
    moneyInput(discount?.minSubtotal),
  );
  const [productIds, setProductIds] = useState<string[] | null>(
    discount?.productIds ?? null,
  );
  const [startsAt, setStartsAt] = useState(dateInput(discount?.startsAt));
  const [endsAt, setEndsAt] = useState(dateInput(discount?.endsAt));
  const [usageLimit, setUsageLimit] = useState(
    discount?.usageLimit === null || discount?.usageLimit === undefined
      ? ''
      : String(discount.usageLimit),
  );
  const [active, setActive] = useState(discount?.active ?? true);
  const { busy, feedback, run } = useAction();
  const t = m.discounts;

  const submit = async () => {
    const result = await run(
      async () => {
        const amount =
          type === 'percent'
            ? parsePercent(value)
            : type === 'fixed'
              ? parseMoney(value)
              : 0;

        if (amount === null) invalidInput();

        const fields: Omit<AdminDiscountInput, 'code' | 'type'> = {
          value: amount,
          minSubtotal: parseMoney(minSubtotal),
          productIds: productIds && productIds.length > 0 ? productIds : null,
          startsAt: fromDateInput(startsAt),
          endsAt: fromDateInput(endsAt, true),
          usageLimit: parseInteger(usageLimit),
          active,
        };

        return discount
          ? client.updateDiscount(discount.id, fields)
          : client.createDiscount({ ...fields, code: code.trim(), type });
      },
      discount ? m.common.saved : t.created,
    );

    if (result) props.onDone();
  };

  return (
    <form
      className={cx('sk-root sk-admin-discount', props.className)}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <button
        type="button"
        className="sk-button sk-button-ghost sk-align-start"
        onClick={props.onCancel}
      >
        ← {m.common.back}
      </button>
      <h2 className="sk-title">{discount ? discount.code : t.new}</h2>

      <div className="sk-grid">
        <Field label={t.code}>
          <input
            className="sk-input sk-mono"
            required
            disabled={discount !== undefined}
            pattern="[A-Za-z0-9_\-]{2,40}"
            title={t.codeHint}
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
          />
        </Field>
        <Field label={t.type}>
          <select
            className="sk-input"
            disabled={discount !== undefined}
            value={type}
            onChange={(event) => setType(event.target.value as DiscountType)}
          >
            {TYPES.map((entry) => (
              <option key={entry} value={entry}>
                {t.types[entry]}
              </option>
            ))}
          </select>
        </Field>
        {type !== 'free_shipping' ? (
          <Field
            label={
              type === 'percent'
                ? t.percent
                : interpolate(t.amount, { currency })
            }
          >
            <input
              className="sk-input"
              required
              inputMode="decimal"
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
          </Field>
        ) : null}
        <Field label={interpolate(t.minSubtotal, { currency })}>
          <input
            className="sk-input"
            inputMode="decimal"
            value={minSubtotal}
            onChange={(event) => setMinSubtotal(event.target.value)}
          />
        </Field>
        <Field label={t.startsAt}>
          <input
            className="sk-input"
            type="date"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
          />
        </Field>
        <Field label={t.endsAt}>
          <input
            className="sk-input"
            type="date"
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
          />
        </Field>
        <Field label={t.usageLimit}>
          <input
            className="sk-input"
            inputMode="numeric"
            value={usageLimit}
            onChange={(event) => setUsageLimit(event.target.value)}
          />
        </Field>
      </div>

      <fieldset className="sk-fieldset">
        <legend>{t.products}</legend>
        <Check
          label={t.allProducts}
          checked={productIds === null}
          onChange={(checked) => setProductIds(checked ? null : [])}
        />
        {productIds !== null
          ? (products ?? [])
              .filter((product) => product.kind !== 'gift_card')
              .map((product) => (
                <Check
                  key={product.id}
                  label={product.name}
                  checked={productIds.includes(product.id)}
                  onChange={(checked) =>
                    setProductIds(
                      checked
                        ? [...productIds, product.id]
                        : productIds.filter((id) => id !== product.id),
                    )
                  }
                />
              ))
          : null}
      </fieldset>

      <Check label={t.active} checked={active} onChange={setActive} />

      <FeedbackText feedback={feedback} />

      <div className="sk-actions">
        <button
          type="button"
          className="sk-button sk-button-ghost"
          onClick={props.onCancel}
        >
          {m.common.cancel}
        </button>
        <button
          type="submit"
          className="sk-button sk-button-primary"
          disabled={busy}
        >
          {discount ? m.common.save : m.common.create}
        </button>
      </div>
    </form>
  );
}
