'use client';

import dynamic from 'next/dynamic';

// the kits run in the browser only (localStorage, crypto, window)
export const ShopDemo = dynamic(
  () => import('./shop-demo').then((m) => m.ShopDemo),
  {
    ssr: false,
  },
);
export const SubDemo = dynamic(
  () => import('./sub-demo').then((m) => m.SubDemo),
  {
    ssr: false,
  },
);
export const PayPage = dynamic(
  () => import('./pay-page').then((m) => m.PayPage),
  {
    ssr: false,
  },
);
