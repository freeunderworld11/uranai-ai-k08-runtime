# Sign boundary refinement validation

Verified locally on 2026-09-10; production deployment remains PENDING.

The existing explicit UTC range adapter now refines observed transitions by bisection to at most one second. A speed sign reversal at grid endpoints triggers a stationary-point search and subdivision. This is bounded numerical evidence, not exhaustive root isolation or a certification of sign stability.

## Independent native reference

Official Swiss Ephemeris `swetest64.exe` 2.10.03, SHA-256 `C44D29554927AD1BA44196B5B274904F012DACAA3B4797F7F4AE6A48618FC1C5`, with the same bundled ephemeris data:

```
swetest64.exe -b20.3.2000 -ut07:35:14 -p0 -fPls -g, -head -eswe -edir<ephe>
Sun, 359.9999925, 0.9930276
swetest64.exe -b20.3.2000 -ut07:35:15 -p0 -fPls -g, -head -eswe -edir<ephe>
Sun, 0.0000040, 0.9930276
```

The local Workers response for March 20–21, 2000 UTC produces one direct solar 11-to-0 transition bracket of at most one second, overlapping that independently measured interval. Tests check endpoint longitude sides and the non-certified status. This uses the runtime's existing UTC-to-Julian-day convention; it does not independently certify the UTC/UT1 conversion.

## Automated coverage

26 tests pass, including previous native planet/house regressions and partial-result preservation. New cases cover analytic forward/retrograde roots, 360-degree wrapping, two crossings hidden between equal-sign grid endpoints with a detected speed reversal, exact grid boundaries without duplicates, failed midpoint evaluation, and bounded evaluation exhaustion. A request is limited to 2048 evaluation points. Production CPU/memory measurement is still pending.

All-transition completeness, tangent boundary contact, arbitrarily narrow excursions, local civil-time/range agreement, and house/aspect range stability remain unverified. No formal stable-sign flag or complete birth chart is produced by this endpoint.
