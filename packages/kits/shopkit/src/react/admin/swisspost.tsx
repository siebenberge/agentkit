'use client';

import { useState } from 'react';

import { interpolate } from '../../i18n';
import {
  SWISS_POST_ADDITIONAL_SERVICES,
  SWISS_POST_DELIVERY_INSTRUCTIONS,
  SWISS_POST_SERVICES,
  type SwissPostAdditionalService,
  type SwissPostDeliveryInstruction,
  type SwissPostServiceId,
  formatIdentCode,
  swissPostTrackingUrl,
} from '../../swisspost/services';
import { useShopAdmin } from './provider';
import type { AdminOrder, AdminSwissPostLabel } from './types';
import {
  Check,
  FeedbackText,
  Field,
  invalidInput,
  parseInteger,
  useAction,
} from './ui';

/*
 * Swiss Post plugin. Shown only with `swisspost` on the provider – the
 * admin route exists only with `swisspost` on `createShopAdminHandler`. The
 * labels are read from the metadata the plugin writes.
 */

const SERVICES = Object.keys(SWISS_POST_SERVICES) as SwissPostServiceId[];
const ADDITIONAL = Object.keys(
  SWISS_POST_ADDITIONAL_SERVICES,
) as SwissPostAdditionalService[];
const INSTRUCTIONS = Object.keys(
  SWISS_POST_DELIVERY_INSTRUCTIONS,
) as SwissPostDeliveryInstruction[];

/** `order.metadata.swisspost.labels` – the current label last. */
export function orderLabels(order: AdminOrder): AdminSwissPostLabel[] {
  const labels = (order.metadata.swisspost as { labels?: unknown } | undefined)
    ?.labels;

  return Array.isArray(labels) ? (labels as AdminSwissPostLabel[]) : [];
}

/** Saves the label file in the browser (print it from there). */
function download(file: Blob, fileName: string) {
  if (typeof URL.createObjectURL !== 'function') return;

  const url = URL.createObjectURL(file);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Order detail: the Swiss Post label – create it, see the earlier ones. */
export function SwissPostOrderPanel(props: {
  order: AdminOrder;
  /** After a label: reload the order (shipped, tracking number). */
  onCreated: () => void;
}) {
  const { client, m, dateTime } = useShopAdmin();
  const { busy, feedback, run } = useAction();
  const { order } = props;
  const labels = orderLabels(order);
  const current = labels.at(-1) ?? null;
  const t = m.swisspost;
  const [service, setService] = useState<SwissPostServiceId | ''>('');
  const [additional, setAdditional] = useState<SwissPostAdditionalService[]>(
    [],
  );
  const [instructions, setInstructions] = useState<
    SwissPostDeliveryInstruction[]
  >([]);
  const [deliveryPlace, setDeliveryPlace] = useState('');
  const [weight, setWeight] = useState('');
  const [again, setAgain] = useState(false);

  const country = (order.shippingAddress?.country ?? 'CH').toUpperCase();
  const shippable =
    order.status === 'confirmed' &&
    (order.fulfillmentStatus === 'unfulfilled' ||
      order.fulfillmentStatus === 'shipped') &&
    order.shipping !== null &&
    !order.shipping.pickup &&
    order.shippingAddress !== null;
  const domestic = country === 'CH' || country === 'LI';

  if (!shippable && labels.length === 0) return null;

  const toggle = <T extends string>(list: T[], code: T, on: boolean) =>
    on ? [...list, code] : list.filter((entry) => entry !== code);

  const create = async () => {
    const created = await run(
      async () => {
        const grams = weight.trim() ? parseInteger(weight) : null;

        if (weight.trim() && (grams === null || grams < 1)) invalidInput();

        // an empty choice keeps the shipment of the order's rate
        return client.swisspost.createLabel(order.id, {
          ...(service ? { service } : {}),
          ...(additional.length > 0 ? { additionalServices: additional } : {}),
          ...(instructions.length > 0
            ? { deliveryInstructions: instructions }
            : {}),
          ...(instructions.includes('ZAW3219') && deliveryPlace.trim()
            ? { deliveryPlace: deliveryPlace.trim() }
            : {}),
          ...(grams !== null ? { weightGrams: grams } : {}),
          force: labels.length > 0,
        });
      },
      (label) => interpolate(t.created, { number: label.trackingNumber }),
    );

    if (!created) return;

    download(created.file, created.fileName);
    setService('');
    setAdditional([]);
    setInstructions([]);
    setDeliveryPlace('');
    setWeight('');
    setAgain(false);
    props.onCreated();
  };

  return (
    <section className="sk-panel">
      <div className="sk-card-header">
        <h3 className="sk-heading">{t.title}</h3>
      </div>

      {current ? (
        <dl className="sk-dl">
          <dt>{t.trackingNumber}</dt>
          <dd className="sk-mono">
            <a
              href={swissPostTrackingUrl(current.identCode)}
              target="_blank"
              rel="noreferrer"
            >
              {formatIdentCode(current.identCode)}
            </a>
          </dd>
          <dt>{t.service}</dt>
          <dd>{t.services[current.service]}</dd>
          <dt>{t.createdAt}</dt>
          <dd>{dateTime(current.createdAt)}</dd>
          {current.url ? (
            <dd>
              <a href={current.url} target="_blank" rel="noreferrer">
                {t.open}
              </a>
            </dd>
          ) : null}
        </dl>
      ) : null}

      {current && current.warnings.length > 0 ? (
        <div className="sk-section">
          <span className="sk-muted">{t.warnings}</span>
          <ul className="sk-list">
            {current.warnings.map((warning, index) => (
              <li key={index}>{warning.message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {shippable && !domestic ? (
        <p className="sk-muted">{t.domesticOnly}</p>
      ) : null}

      {shippable && domestic && current && !again ? (
        <button
          type="button"
          className="sk-button sk-align-start"
          onClick={() => setAgain(true)}
        >
          {t.createAgain}
        </button>
      ) : null}

      {shippable && domestic && (!current || again) ? (
        <form
          className="sk-section"
          onSubmit={(event) => {
            event.preventDefault();
            void create();
          }}
        >
          {current ? <p className="sk-notice">{t.againHint}</p> : null}
          <Field label={t.service}>
            <select
              className="sk-input"
              value={service}
              onChange={(event) =>
                setService(event.target.value as SwissPostServiceId | '')
              }
            >
              <option value="">{t.rateService}</option>
              {SERVICES.map((code) => (
                <option key={code} value={code}>
                  {t.services[code]}
                </option>
              ))}
            </select>
          </Field>
          <details className="sk-details">
            <summary>{t.options}</summary>
            <fieldset className="sk-fieldset">
              <legend>{t.additionalServices}</legend>
              {ADDITIONAL.map((code) => (
                <Check
                  key={code}
                  label={t.additional[code]}
                  checked={additional.includes(code)}
                  onChange={(on) => setAdditional(toggle(additional, code, on))}
                />
              ))}
            </fieldset>
            <fieldset className="sk-fieldset">
              <legend>{t.deliveryInstructions}</legend>
              {INSTRUCTIONS.map((code) => (
                <Check
                  key={code}
                  label={t.instructions[code]}
                  checked={instructions.includes(code)}
                  onChange={(on) =>
                    setInstructions(toggle(instructions, code, on))
                  }
                />
              ))}
            </fieldset>
            {instructions.includes('ZAW3219') ? (
              <Field label={t.deliveryPlace}>
                <input
                  className="sk-input"
                  maxLength={35}
                  value={deliveryPlace}
                  onChange={(event) => setDeliveryPlace(event.target.value)}
                />
              </Field>
            ) : null}
            <Field label={t.weight}>
              <input
                className="sk-input"
                inputMode="numeric"
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
              />
            </Field>
          </details>
          <div className="sk-inline">
            <button
              type="submit"
              className="sk-button sk-button-primary"
              disabled={busy}
            >
              {busy ? t.creating : t.create}
            </button>
            {current ? (
              <button
                type="button"
                className="sk-button sk-button-ghost"
                onClick={() => setAgain(false)}
              >
                {m.common.cancel}
              </button>
            ) : null}
          </div>
        </form>
      ) : null}

      <FeedbackText feedback={feedback} />
    </section>
  );
}
