# Test sites of the kits

One static Next.js app, deployed twice:

| Site | `NEXT_PUBLIC_DEMO_KIT` | Page |
|---|---|---|
| shop.agentkit.ch | `shop` | `/` = shopkit demo |
| sub.agentkit.ch | `sub` | `/` = subkit demo |

The kits run **in the visitor's browser**: the same engine, HTTP handler and
React components as in a product, with the memory adapter persisted to
`localStorage`, a simulated payment page (`/pay`) instead of zahls.ch, and a
clock that can be moved forward. Nothing is sent anywhere; every visitor has
their own sandbox ("Reset" starts over).

The **Config** tab holds the kit's real options (`lib/config.ts`): the
visitor changes a value, the runtime is created again with it on the same
data, and the generated code marks the changed lines. Keep the fields and the
code in sync with the kit's options.

```bash
pnpm --filter demos dev            # http://localhost:3001/shop, /sub
NEXT_PUBLIC_DEMO_KIT=shop pnpm --filter demos build   # static export in out/
```

Copy (de / fr / it / en) lives in `lib/copy.ts`.
