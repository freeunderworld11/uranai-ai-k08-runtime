# Third-party components and local modifications

Swiss Ephemeris: Copyright (C) 1997–2021 Astrodienst AG, Switzerland.
Authors: Dieter Koch and Alois Treindl. Version: 2.10.03.
This project is not endorsed by Astrodienst or the wrapper authors.

Runtime dependencies are pinned in package-lock.json:

- @kuntay/swisseph 0.2.2 — AGPL-3.0-or-later.
- @kuntay/swisseph-data 0.2.2 — AGPL-3.0-or-later; bundled subset: sepl_18.se1, semo_18.se1, seas_18.se1. Data manifest declares DE441.

The AGPL v3 option is used for this integration. Upstream LICENSE and NOTICE remain in the installed dependencies and are copied into .generated/core-LICENSE, core-NOTICE, data-LICENSE and data-NOTICE by the build. Preserve them with redistributed artifacts.

Local changes, 2026-09-10, are reproducibly applied to generated copies by scripts/prepare-runtime.mjs:

1. Disable Node filesystem initialization in the Workers-only Emscripten glue.
2. Statically import WASM and instantiate the compiled module supplied by Workers.
3. Expose actual C return flags for swe_calc_ut and swe_houses_ex2. No astronomical formulas or WASM bytes are modified.

The preparation script checks upstream versions and SHA-256 for the patched JS, WASM and all three data files. npm ci uses the locked package integrity. No downloaded executable is required by the build or tests.

Source and build references:

- [Exact wrapper and build-tool source revision for both packages](https://github.com/kuntayerkus/swisseph-wasm/tree/4c4b0f48b15d1795b44ed068e8532fd20d1e145c)
- [Swiss Ephemeris C sources](https://github.com/aloistr/swisseph)
- [Official licensing information](https://www.astro.com/swisseph/)
- [Cloudflare WASM integration](https://developers.cloudflare.com/workers/runtime-apis/webassembly/javascript/)

Before publicly serving a release, ensure its complete corresponding source, upstream notices, exact upstream source revisions and WASM build instructions remain available to users. A link to this adapter alone is not a claim that the release's entire source-publication review has passed. The deployment gate remains pending.

## Regression reference provenance

test/fixtures/native.json was generated using upstream windows/programs/swetest64.exe reporting Swiss Ephemeris 2.10.03, with the same three data files.
Executable SHA-256: C44D29554927AD1BA44196B5B274904F012DACAA3B4797F7F4AE6A48618FC1C5.
Command for each fixture JD:

```sh
swetest64.exe -bj<JD> -ut -p0123456789 -fPlbRs -g, -head -eswe -edir<ephe-directory>
```

Each row stores longitude (degrees), latitude (degrees), distance (AU), longitude speed (degrees/day), in Sun-through-Pluto order. Angular/speed tolerance: 1e-6; distance tolerance: 1e-8. These limits accommodate CLI decimal rounding; they are not an independent observational accuracy claim.

House reference values use the same command with `-p0 -fPl -house139.6503,35.6762,P`: 12 cusps, Ascendant and MC, all in degrees. Each is compared with tolerance 1e-6.
# Additional wrapper modification: planet house positions

The preparation script adds a housePosition wrapper over the existing WASM swe_house_pos export. It reuses instance-owned numeric/error buffers and returns the warning separately. No dependency binary is changed. This additional modification is distributed under the existing project/dependency license terms.
