# Security

Report reproducible issues privately to fluritheme@gmail.com. Keep credentials and customer data out of public issues.

The runtime has no dependencies. It does not fetch assets, send analytics, store data, evaluate source strings or inject supplied HTML. Configuration is validated before use. Canvas is click-through, and no host styles are changed. Hosting and customer accounts belong to the separate Fluri platform.

CI audits both production and development dependencies at high severity. The committed lockfile is installed without unreviewed lifecycle scripts. Build/test patterns are repository-owned and development servers bind to localhost; do not expose development servers publicly or accept untrusted tooling globs.
