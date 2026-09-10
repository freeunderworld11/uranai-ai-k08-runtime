# K08 result adapter v1

Adds structured development output while preserving existing lower-case fields. This is not runtime certification or permission for K09 interpretation.

| Output | Meaning |
| --- | --- |
| K08_NATAL_RESULT | Runtime, time, geography, ten planets, angles, houses, aspects, boundaries, limitations and audit |
| K08_HOUSE_RESULT | Requested Placidus/P, actual system, return code, 12 cusps, fallback and angle statuses |
| K08_AUDIT | Conservative per-response checks, not the completed K19 acceptance report |
| AVAILABLE_COMPONENTS | Numerical evidence for development, not permission to interpret |
| K08_PROVENANCE | Adapter/input contracts, source repository, timezone audit and pending approval |
| K08_STATUS / K09_USAGE_STATUS | RUNTIME_NOT_APPROVED / LOCAL_BLOCK |

Healthy planets retain original numbers when another planet fails. Rejected planets have null formal positions and retain errors in LIMITATION. Failed houses cannot supply alternative cusps. Conditional polar angles retain values and explicit ASC_STATUS/MC_STATUS, which consumers must read together. Single-instant aspects do not claim time-range stability.

Time and geography copy the K02 input echo, preserving precision. The direct JD endpoint cannot invent K02 local time, UTC or geographic provenance. Missing information remains null. Range responses retain observations and boundary brackets in existing lower-case fields; formal planet fields never invent a representative longitude, sign or Julian day. Their status describes range evidence, not a confirmed birth position.

Audit true means a limited response check passed; false means not passed or required approval not established; null means unknown, not evaluated or not applicable, never pass. Current checks cover engine version matching, timezone version presence, JD presence, valid planet count, house return/status and planet-house status. ASPECT_45_PAIRS_VALID checks count only. Full uniqueness/orb validation and the remaining null checks require the dedicated audit stage. LICENSE_GATE_VALID and DEPLOYMENT_GATE_VALID are false because approval is absent, not a finding of a legal violation. OVERALL is FAIL because required gates are unmet. FACT_AUDIT contains the same audit.

Development result_status COMPLETE/PARTIAL/UNAVAILABLE remains separate from formal OVERALL_STATUS RUNTIME_NOT_APPROVED. Consumers must enforce K09_USAGE_STATUS LOCAL_BLOCK even when numbers are available. No K09_RESULT or interpretation is generated.

The adapter applies to /calculate, /calculate/k02 and /calculate/k02/range after their calculation/input-gate result. Malformed requests and thrown failures keep the existing error envelope. The independent solar-boundary service and health keep their own contracts.

Remaining work includes evidence-backed audit evaluation, fixed K19 acceptance cases, provenance approval and deployment acceptance. This adapter does not claim full specification compliance.
