# Security policy

The kits handle payments, invoices and customer data. We take reports
seriously and are grateful for them.

## Reporting a vulnerability

Please **do not open a public issue**. Report it privately through GitHub:
[Security → Report a vulnerability](https://github.com/siebenberge/agentkit/security/advisories/new).

Helpful to include:

- the affected package and version (`@agentkit.ch/subkit@0.2.0`, …) or commit,
- what an attacker can do and under which conditions,
- steps or a minimal snippet to reproduce it.

We confirm receipt within a few working days, keep you informed about the
fix and credit you in the advisory unless you prefer otherwise. Please give
us reasonable time to release a fix before you disclose the issue.

## Supported versions

The kits are in preview. Fixes go into the latest minor version of each
package on npm:

| Package | Supported |
|---|---|
| [`@agentkit.ch/subkit`](https://www.npmjs.com/package/@agentkit.ch/subkit) | latest 0.x minor |
| [`@agentkit.ch/shopkit`](https://www.npmjs.com/package/@agentkit.ch/shopkit) | latest 0.x minor |

## Scope

In scope: the code in this repository – the kits, their HTTP and webhook
handlers, the MCP handlers and the website `agentkit.ch` including its docs
MCP endpoint.

Out of scope: vulnerabilities in payment providers (e.g. zahls.ch) or other
third-party services – please report those to the provider – and issues in
an application that uses the kits but configures them insecurely (e.g. an
`authorize` callback that lets everyone in).
