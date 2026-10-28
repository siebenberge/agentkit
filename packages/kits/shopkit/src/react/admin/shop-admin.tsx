'use client';

import { useState } from 'react';

import { AdminBankImport } from './bank-import';
import { AdminDiscounts } from './discounts';
import { AdminGiftCards } from './gift-cards';
import { AdminHsSoft } from './hssoft';
import { AdminOrders } from './orders';
import { AdminProducts } from './products';
import { useShopAdmin } from './provider';
import { cx } from './ui';

export type AdminSection =
  'orders' | 'products' | 'discounts' | 'giftCards' | 'bank' | 'hssoft';

const SECTIONS: AdminSection[] = [
  'orders',
  'products',
  'discounts',
  'giftCards',
  'bank',
];

export type ShopAdminProps = {
  /** Shown sections, in this order (default: all; `hssoft` only with the plugin on). */
  sections?: AdminSection[];
  initialSection?: AdminSection;
  /** Opens this order first (e.g. from the link in the merchant email). */
  initialOrderId?: string | null;
  /** After every change – e.g. to refresh other parts of your page. */
  onChange?: () => void;
  className?: string;
};

/**
 * The whole back office in one component: orders, products and stock,
 * discount codes, gift cards and the bank import. Put it on a page that
 * only staff can open – the API checks the session again on every request.
 */
export function ShopAdmin(props: ShopAdminProps) {
  const { m, hssoft } = useShopAdmin();
  const sections = (props.sections ?? [...SECTIONS, 'hssoft']).filter(
    // the HS-Soft plugin is off: its section is not there
    (name) => name !== 'hssoft' || hssoft,
  );
  const [section, setSection] = useState<AdminSection>(
    props.initialSection ?? sections[0] ?? 'orders',
  );

  return (
    <div className={cx('sk-root sk-admin', props.className)}>
      {sections.length > 1 ? (
        <nav className="sk-tabs" role="tablist">
          {sections.map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              className="sk-tab"
              aria-selected={section === name}
              onClick={() => setSection(name)}
            >
              {m.nav[name]}
            </button>
          ))}
        </nav>
      ) : null}

      <div role="tabpanel">
        {section === 'orders' ? (
          <AdminOrders
            initialOrderId={props.initialOrderId}
            onChange={props.onChange}
          />
        ) : section === 'products' ? (
          <AdminProducts onChange={props.onChange} />
        ) : section === 'discounts' ? (
          <AdminDiscounts onChange={props.onChange} />
        ) : section === 'giftCards' ? (
          <AdminGiftCards onChange={props.onChange} />
        ) : section === 'hssoft' ? (
          <AdminHsSoft onChange={props.onChange} />
        ) : (
          <AdminBankImport onChange={props.onChange} />
        )}
      </div>
    </div>
  );
}
