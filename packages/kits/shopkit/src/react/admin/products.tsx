'use client';

import { useEffect, useState } from 'react';

import { LOCALES, interpolate } from '../../i18n';
import type { Locale, ProductKind, ProductStatus } from '../../types';
import { HsSoftProductPanel, productArticles } from './hssoft';
import { useShopAdmin } from './provider';
import type {
  AdminProduct,
  AdminProductInput,
  AdminVariant,
  AdminVariantInput,
} from './types';
import {
  Badge,
  Check,
  FeedbackText,
  Field,
  Pending,
  cx,
  invalidInput,
  moneyInput,
  parseInteger,
  parseMoney,
  percent,
  useAction,
  useLoad,
} from './ui';

const KINDS: ProductKind[] = ['physical', 'digital', 'gift_card'];
const STATUSES: ProductStatus[] = ['draft', 'active', 'archived'];
/** Swiss VAT rates (basis points). */
const RATES = [810, 260, 380, 0];

// ------------------------------------------------------------ drafts

type VariantDraft = {
  name: string;
  sku: string;
  price: string;
  compareAtPrice: string;
  weight: string;
  options: string;
  trackStock: boolean;
  stock: string;
  allowBackorder: boolean;
  status: 'active' | 'archived';
};

function formatOptions(options: Record<string, string>) {
  return Object.entries(options)
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ');
}

/** `Grösse: 42; Farbe: Blau` → `{ Grösse: '42', Farbe: 'Blau' }`. */
function parseOptions(text: string) {
  const options: Record<string, string> = {};

  for (const part of text.split(';')) {
    const entry = part.trim();

    if (!entry) continue;

    const colon = entry.indexOf(':');

    if (colon < 1) invalidInput();
    options[entry.slice(0, colon).trim()] = entry.slice(colon + 1).trim();
  }

  return options;
}

function variantDraft(variant?: AdminVariant): VariantDraft {
  return {
    name: variant?.name ?? '',
    sku: variant?.sku ?? '',
    price: moneyInput(variant?.price),
    compareAtPrice: moneyInput(variant?.compareAtPrice),
    weight: variant ? String(variant.weightGrams) : '',
    options: variant ? formatOptions(variant.options) : '',
    trackStock: variant?.trackStock ?? true,
    stock: variant ? String(variant.stock) : '',
    allowBackorder: variant?.allowBackorder ?? false,
    status: variant?.status ?? 'active',
  };
}

/** The draft as API input (without the stock). */
function variantInput(draft: VariantDraft): AdminVariantInput {
  const price = parseMoney(draft.price);

  if (price === null || !draft.sku.trim()) invalidInput();

  return {
    sku: draft.sku.trim(),
    name: draft.name.trim() || null,
    options: parseOptions(draft.options),
    price,
    compareAtPrice: parseMoney(draft.compareAtPrice),
    weightGrams: parseInteger(draft.weight) ?? 0,
    trackStock: draft.trackStock,
    allowBackorder: draft.allowBackorder,
    status: draft.status,
  };
}

type ProductDraft = {
  name: string;
  slug: string;
  /** The slug follows the name until it is edited. */
  slugEdited: boolean;
  kind: ProductKind;
  status: ProductStatus;
  /** Basis points, `''` → the shop's default rate. */
  taxRateBps: string;
  description: string;
  images: string;
  sortOrder: string;
  translations: Record<Locale, { name: string; description: string }>;
};

function productDraft(product?: AdminProduct | null): ProductDraft {
  return {
    name: product?.name ?? '',
    slug: product?.slug ?? '',
    slugEdited: product !== undefined && product !== null,
    kind: product?.kind ?? 'physical',
    status: product?.status ?? 'active',
    taxRateBps:
      product?.taxRateBps === null || product?.taxRateBps === undefined
        ? ''
        : String(product.taxRateBps),
    description: product?.description ?? '',
    images: (product?.images ?? []).join('\n'),
    sortOrder: String(product?.sortOrder ?? 0),
    translations: Object.fromEntries(
      LOCALES.map((locale) => [
        locale,
        {
          name: product?.translations[locale]?.name ?? '',
          description: product?.translations[locale]?.description ?? '',
        },
      ]),
    ) as ProductDraft['translations'],
  };
}

function productInput(draft: ProductDraft): AdminProductInput {
  if (!draft.name.trim() || !draft.slug.trim()) invalidInput();

  const translations: AdminProductInput['translations'] = {};

  for (const locale of LOCALES) {
    const entry = draft.translations[locale];

    if (entry.name.trim() || entry.description.trim()) {
      translations[locale] = {
        ...(entry.name.trim() ? { name: entry.name.trim() } : {}),
        ...(entry.description.trim()
          ? { description: entry.description.trim() }
          : {}),
      };
    }
  }

  return {
    name: draft.name.trim(),
    slug: draft.slug.trim(),
    kind: draft.kind,
    status: draft.status,
    // vouchers carry no VAT
    taxRateBps:
      draft.kind === 'gift_card' || draft.taxRateBps === ''
        ? null
        : Number(draft.taxRateBps),
    description: draft.description.trim() || null,
    images: draft.images
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
    sortOrder: parseInteger(draft.sortOrder) ?? 0,
    translations,
  };
}

/** `Röstbuch Zürich` → `roestbuch-zuerich`. */
function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

// ------------------------------------------------------------ list

export type AdminProductsProps = {
  onChange?: () => void;
  className?: string;
};

/** Catalog: products with their variants, prices, VAT and stock. */
export function AdminProducts(props: AdminProductsProps) {
  const { client, m, money, hssoft } = useShopAdmin();
  const [selected, setSelected] = useState<string | null>(null);
  const {
    data: products,
    error,
    reload,
  } = useLoad(() => client.products(), [client]);
  const t = m.products;

  if (selected) {
    return (
      // not keyed: a created product stays in the same editor (and message)
      <ProductEditor
        className={props.className}
        productId={selected === 'new' ? undefined : selected}
        onBack={() => {
          setSelected(null);
          reload();
        }}
        onCreated={setSelected}
        onChange={props.onChange}
      />
    );
  }

  return (
    <div className={cx('sk-root sk-admin-products', props.className)}>
      <div className="sk-toolbar">
        <span />
        <button
          type="button"
          className="sk-button sk-button-primary"
          onClick={() => setSelected('new')}
        >
          {t.new}
        </button>
      </div>

      {!products ? (
        <Pending error={error} />
      ) : products.length === 0 ? (
        <p className="sk-muted">{t.empty}</p>
      ) : (
        <div className="sk-table-wrap">
          <table className="sk-table">
            <thead>
              <tr>
                <th>{t.product}</th>
                <th>{t.kind}</th>
                <th>{t.status}</th>
                <th className="sk-num">{t.price}</th>
                <th className="sk-num">{t.stock}</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const active = product.variants.filter(
                  (variant) => variant.status === 'active',
                );
                const prices = active.map((variant) => variant.price);
                const min = prices.length > 0 ? Math.min(...prices) : null;
                const max = prices.length > 0 ? Math.max(...prices) : null;
                const tracked = active.filter((variant) => variant.trackStock);

                return (
                  <tr
                    key={product.id}
                    className="sk-row-link"
                    onClick={() => setSelected(product.id)}
                  >
                    <td>
                      <div className="sk-product-cell">
                        {product.images[0] ? (
                          <img
                            className="sk-thumb"
                            src={product.images[0]}
                            alt=""
                          />
                        ) : (
                          <span className="sk-thumb" />
                        )}
                        <div>
                          <button
                            type="button"
                            className="sk-link"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelected(product.id);
                            }}
                          >
                            {product.name}
                          </button>
                          <div className="sk-muted">
                            {product.slug}
                            {hssoft && productArticles(product).length > 0
                              ? ` · ${m.hssoft.order}`
                              : ''}
                            {product.variants.length > 1
                              ? ` · ${interpolate(t.variantCount, { count: product.variants.length })}`
                              : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{t.kinds[product.kind]}</td>
                    <td>
                      <Badge
                        tone={
                          product.status === 'active' ? 'success' : 'neutral'
                        }
                      >
                        {t.statuses[product.status]}
                      </Badge>
                    </td>
                    <td className="sk-num">
                      {min === null
                        ? m.common.none
                        : min === max
                          ? money(min)
                          : interpolate(t.from, { price: money(min) })}
                    </td>
                    <td className="sk-num">
                      {tracked.length === 0
                        ? t.unlimited
                        : tracked.reduce(
                            (sum, variant) => sum + variant.stock,
                            0,
                          )}
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

// ------------------------------------------------------------ editor

function ProductEditor(props: {
  productId?: string;
  onBack: () => void;
  onCreated: (productId: string) => void;
  onChange?: () => void;
  className?: string;
}) {
  const { client, m, hssoft } = useShopAdmin();
  const creating = props.productId === undefined;
  const {
    data: product,
    setData,
    error,
  } = useLoad(
    () =>
      props.productId ? client.product(props.productId) : Promise.resolve(null),
    [client, props.productId],
  );
  const [draft, setDraft] = useState<ProductDraft>(() => productDraft());
  const [variants, setVariants] = useState<VariantDraft[]>(() => [
    variantDraft(),
  ]);
  const [adding, setAdding] = useState(false);
  const { busy, feedback, run } = useAction();
  const t = m.products;

  // the loaded product fills the form (again after saving)
  useEffect(() => {
    if (product) setDraft(productDraft(product));
  }, [product]);

  const set = <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  if (!creating && !product) {
    return (
      <div className={cx('sk-root', props.className)}>
        <button
          type="button"
          className="sk-button sk-button-ghost sk-align-start"
          onClick={props.onBack}
        >
          ← {m.common.back}
        </button>
        <Pending error={error} />
      </div>
    );
  }

  const save = async () => {
    const result = await run(
      async () => {
        const input = productInput(draft);

        return product
          ? client.updateProduct(product.id, input)
          : client.createProduct({
              ...input,
              variants: variants.map((variant) => ({
                ...variantInput(variant),
                stock: variant.trackStock
                  ? (parseInteger(variant.stock) ?? 0)
                  : undefined,
              })),
            });
      },
      product ? m.common.saved : t.created,
    );

    if (!result) return;

    props.onChange?.();
    if (product) {
      setData({ ...result, variants: product.variants });
    } else {
      props.onCreated(result.id);
    }
  };

  const rates =
    RATES.includes(Number(draft.taxRateBps)) || !draft.taxRateBps
      ? RATES
      : [...RATES, Number(draft.taxRateBps)];

  return (
    <div className={cx('sk-root sk-admin-product', props.className)}>
      <button
        type="button"
        className="sk-button sk-button-ghost sk-align-start"
        onClick={props.onBack}
      >
        ← {m.common.back}
      </button>

      <form
        className="sk-section"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <h2 className="sk-title">{product ? product.name : t.new}</h2>

        <div className="sk-grid">
          <Field label={t.name}>
            <input
              className="sk-input"
              required
              value={draft.name}
              onChange={(event) => {
                const name = event.target.value;

                setDraft((current) => ({
                  ...current,
                  name,
                  slug: current.slugEdited ? current.slug : slugify(name),
                }));
              }}
            />
          </Field>
          <Field label={t.slug}>
            <input
              className="sk-input sk-mono"
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              value={draft.slug}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  slug: event.target.value.toLowerCase(),
                  slugEdited: true,
                }))
              }
            />
          </Field>
          <Field label={t.kind}>
            <select
              className="sk-input"
              value={draft.kind}
              onChange={(event) =>
                set('kind', event.target.value as ProductKind)
              }
            >
              {KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {t.kinds[kind]}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t.status}>
            <select
              className="sk-input"
              value={draft.status}
              onChange={(event) =>
                set('status', event.target.value as ProductStatus)
              }
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t.statuses[status]}
                </option>
              ))}
            </select>
          </Field>
          {draft.kind === 'gift_card' ? (
            <p className="sk-muted sk-field-note">{t.vatGiftCard}</p>
          ) : (
            <Field label={t.vat}>
              <select
                className="sk-input"
                value={draft.taxRateBps}
                onChange={(event) => set('taxRateBps', event.target.value)}
              >
                <option value="">{t.vatDefault}</option>
                {rates.map((rate) => (
                  <option key={rate} value={String(rate)}>
                    {percent(rate)}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label={t.sortOrder}>
            <input
              className="sk-input"
              inputMode="numeric"
              value={draft.sortOrder}
              onChange={(event) => set('sortOrder', event.target.value)}
            />
          </Field>
        </div>

        <Field label={t.description}>
          <textarea
            className="sk-input"
            rows={3}
            value={draft.description}
            onChange={(event) => set('description', event.target.value)}
          />
        </Field>
        <Field label={t.images}>
          <textarea
            className="sk-input sk-mono"
            rows={2}
            value={draft.images}
            onChange={(event) => set('images', event.target.value)}
          />
        </Field>

        <details className="sk-details">
          <summary>{t.translations}</summary>
          <div className="sk-section">
            {LOCALES.map((locale) => (
              <fieldset key={locale} className="sk-fieldset">
                <legend>{t.languages[locale]}</legend>
                <div className="sk-grid">
                  <Field label={t.name}>
                    <input
                      className="sk-input"
                      lang={locale}
                      value={draft.translations[locale].name}
                      onChange={(event) =>
                        set('translations', {
                          ...draft.translations,
                          [locale]: {
                            ...draft.translations[locale],
                            name: event.target.value,
                          },
                        })
                      }
                    />
                  </Field>
                  <Field label={t.description}>
                    <textarea
                      className="sk-input"
                      lang={locale}
                      rows={2}
                      value={draft.translations[locale].description}
                      onChange={(event) =>
                        set('translations', {
                          ...draft.translations,
                          [locale]: {
                            ...draft.translations[locale],
                            description: event.target.value,
                          },
                        })
                      }
                    />
                  </Field>
                </div>
              </fieldset>
            ))}
          </div>
        </details>

        {creating ? (
          <section className="sk-section">
            <h3 className="sk-heading">{t.variants}</h3>
            {variants.map((variant, index) => (
              <div key={index} className="sk-panel">
                <VariantFields
                  draft={variant}
                  withStock
                  onChange={(next) =>
                    setVariants(
                      variants.map((entry, other) =>
                        other === index ? next : entry,
                      ),
                    )
                  }
                />
              </div>
            ))}
            <button
              type="button"
              className="sk-button sk-align-start"
              onClick={() => setVariants([...variants, variantDraft()])}
            >
              {t.addVariant}
            </button>
          </section>
        ) : null}

        <FeedbackText feedback={feedback} />

        <div className="sk-actions">
          <button
            type="submit"
            className="sk-button sk-button-primary"
            disabled={busy}
          >
            {product ? m.common.save : m.common.create}
          </button>
        </div>
      </form>

      {product && hssoft ? (
        <HsSoftProductPanel
          product={product}
          onSaved={(next) => {
            setData({ ...product, metadata: next.metadata });
            props.onChange?.();
          }}
        />
      ) : null}

      {product ? (
        <section className="sk-section">
          <h3 className="sk-heading">{t.variants}</h3>
          {product.variants.map((variant) => (
            <VariantEditor
              key={variant.id}
              productId={product.id}
              variant={variant}
              onSaved={(next) => {
                setData({
                  ...product,
                  variants: product.variants.map((entry) =>
                    entry.id === next.id ? next : entry,
                  ),
                });
                props.onChange?.();
              }}
            />
          ))}
          {adding ? (
            <VariantEditor
              productId={product.id}
              onCancel={() => setAdding(false)}
              onSaved={(next) => {
                setAdding(false);
                setData({ ...product, variants: [...product.variants, next] });
                props.onChange?.();
              }}
            />
          ) : (
            <button
              type="button"
              className="sk-button sk-align-start"
              onClick={() => setAdding(true)}
            >
              {t.addVariant}
            </button>
          )}
        </section>
      ) : null}
    </div>
  );
}

function VariantFields(props: {
  draft: VariantDraft;
  onChange: (draft: VariantDraft) => void;
  /** New variant: the stock is part of the form. */
  withStock?: boolean;
}) {
  const { m, currency } = useShopAdmin();
  const { draft } = props;
  const t = m.products;
  const set = <K extends keyof VariantDraft>(key: K, value: VariantDraft[K]) =>
    props.onChange({ ...draft, [key]: value });
  const text = (
    key: 'name' | 'sku' | 'price' | 'compareAtPrice' | 'weight' | 'options',
    label: string,
    options: { required?: boolean; decimal?: boolean; className?: string } = {},
  ) => (
    <Field label={label} className={options.className}>
      <input
        className={cx('sk-input', key === 'sku' && 'sk-mono')}
        required={options.required}
        inputMode={options.decimal ? 'decimal' : undefined}
        value={draft[key]}
        onChange={(event) => set(key, event.target.value)}
      />
    </Field>
  );

  return (
    <div className="sk-section">
      <div className="sk-grid">
        {text('name', t.variantName)}
        {text('sku', t.sku, { required: true })}
        {text('price', `${t.price} (${currency})`, {
          required: true,
          decimal: true,
        })}
        {text('compareAtPrice', `${t.compareAtPrice} (${currency})`, {
          decimal: true,
        })}
        {text('weight', t.weight, { decimal: true })}
        {props.withStock && draft.trackStock ? (
          <Field label={t.stock}>
            <input
              className="sk-input"
              inputMode="numeric"
              value={draft.stock}
              onChange={(event) => set('stock', event.target.value)}
            />
          </Field>
        ) : null}
      </div>
      {text('options', t.options)}
      <div className="sk-inline sk-wrap">
        <Check
          label={t.trackStock}
          checked={draft.trackStock}
          onChange={(checked) => set('trackStock', checked)}
        />
        {draft.trackStock ? (
          <Check
            label={t.allowBackorder}
            checked={draft.allowBackorder}
            onChange={(checked) => set('allowBackorder', checked)}
          />
        ) : null}
        <Check
          label={t.variantStatus.archived}
          checked={draft.status === 'archived'}
          onChange={(checked) => set('status', checked ? 'archived' : 'active')}
        />
      </div>
    </div>
  );
}

function VariantEditor(props: {
  productId: string;
  /** Missing → a new variant. */
  variant?: AdminVariant;
  onSaved: (variant: AdminVariant) => void;
  onCancel?: () => void;
}) {
  const { client, m } = useShopAdmin();
  const { variant } = props;
  const [draft, setDraft] = useState(() => variantDraft(variant));
  const [stock, setStock] = useState(variant ? String(variant.stock) : '');
  const { busy, feedback, run } = useAction();
  const t = m.products;

  useEffect(() => {
    if (variant) setStock(String(variant.stock));
  }, [variant]);

  const save = () =>
    run(async () => {
      const input = variantInput(draft);

      if (!variant) {
        return client.createVariant(props.productId, {
          ...input,
          stock: input.trackStock ? (parseInteger(draft.stock) ?? 0) : 0,
        });
      }

      return client.updateVariant(variant.id, input);
    }, m.common.saved).then((saved) => {
      if (saved) props.onSaved(saved);
    });

  const saveStock = () =>
    run(async () => {
      const count = parseInteger(stock);

      if (!variant || count === null) invalidInput();

      return client.setStock(variant.id, count);
    }, m.common.saved).then((saved) => {
      if (saved) props.onSaved(saved);
    });

  return (
    <form
      className={cx('sk-panel', variant?.status === 'archived' && 'sk-faded')}
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      {variant ? (
        <div className="sk-card-header">
          <span className="sk-line-name">
            {variant.name || variant.sku}{' '}
            <span className="sk-muted sk-mono">{variant.sku}</span>
          </span>
          {variant.trackStock ? (
            <span className="sk-inline">
              <label className="sk-quantity">
                <span className="sk-sr-only">{t.stock}</span>
                <input
                  inputMode="numeric"
                  aria-label={`${t.stock} ${variant.sku}`}
                  value={stock}
                  onChange={(event) => setStock(event.target.value)}
                />
              </label>
              <button
                type="button"
                className="sk-button sk-button-small"
                disabled={busy || stock === String(variant.stock)}
                onClick={() => void saveStock()}
              >
                {t.setStock}
              </button>
            </span>
          ) : (
            <span className="sk-muted">{t.unlimited}</span>
          )}
        </div>
      ) : null}
      <VariantFields draft={draft} withStock={!variant} onChange={setDraft} />
      <FeedbackText feedback={feedback} />
      <div className="sk-actions">
        {props.onCancel ? (
          <button
            type="button"
            className="sk-button sk-button-ghost"
            onClick={props.onCancel}
          >
            {m.common.cancel}
          </button>
        ) : null}
        <button type="submit" className="sk-button" disabled={busy}>
          {variant ? m.common.save : t.addVariant}
        </button>
      </div>
    </form>
  );
}
