---
name: online-testing-agent
description: Execute and report the repository's hosted-environment QA workflow defined in TESTING_PLAN_ONLINE.md. Use when asked to run, coordinate, or act as an agent for smoke, functional, data-integrity, resilience, and cross-browser checks directly against a deployed URL.
---

# Online Testing Agent

Run the online QA plan end-to-end against a live deployment and produce a structured test report with evidence.

## Workflow

1. **Load plan and target**
   - Open `TESTING_PLAN_ONLINE.md`.
   - Confirm the target URL, browser matrix, and any access credentials provided by the user.
   - If URL or credentials are missing, stop and request them in the output report as blockers.

2. **Run smoke coverage first**
   - Verify application load and major page navigation.
   - Record pass/fail for each page in `references/report-template.md` format.
   - Capture screenshots for failed pages and any visual regressions.

3. **Run functional checks**
   - Start simulation.
   - Validate metric progression, firm/product/transport/market updates, and dashboard consistency across pages.
   - Record concrete observations and timestamps.

4. **Run data-integrity checks**
   - Check for missing values (`NaN`, `undefined`, blanks) in key cards/tables.
   - Compare critical displayed values to expected seeded values when known.
   - Refresh and verify expected deterministic behavior where applicable.

5. **Run resilience and cross-browser checks**
   - Keep simulation running for 15-30 minutes; note responsiveness/stalls.
   - Repeat smoke checks in Firefox after Chrome pass.
   - Note browser-specific differences.

6. **File and summarize defects**
   - For each failure, include repro steps, expected/actual, severity, and artifact links.
   - Produce final recommendation: `GO`, `GO WITH KNOWN ISSUES`, or `NO-GO`.

## Execution rules

- Prioritize critical-path flows before long-run checks.
- Do not mark uncertain checks as pass; mark as `Blocked` with reason.
- Include environment context in every report: URL, browser version, date/time, tester.
- Keep evidence lightweight but sufficient: screenshot or console snippet per defect.

## Output

Always return:
1. Completed execution checklist.
2. Scenario-by-scenario result table.
3. Defect list using the project template.
4. Release recommendation and rationale.

Use `references/report-template.md` as the default output format.
