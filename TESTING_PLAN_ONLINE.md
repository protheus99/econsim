# Online Testing Plan

This plan assumes all testing is performed directly in a live/hosted environment (no local test setup required).

## 1. Scope
- Validate core simulation flows from the browser UI.
- Verify data rendering and cross-page navigation.
- Confirm key business interactions (firms, products, transportation, and market activity).
- Check stability under extended run time.

## 2. Test Environment
- **Execution mode:** Online only (hosted URL).
- **Browsers:** Latest Chrome (required), plus Firefox (recommended).
- **Devices:** Desktop viewport (minimum 1366x768).
- **Data source:** Production-like seeded data in the hosted environment.

## 3. Entry Criteria
- Hosted deployment is reachable.
- Required datasets are loaded without console errors.
- Test account/access (if needed) is available.

## 4. Test Scenarios

### A. Smoke Tests
1. Open the landing page and confirm app load without blocking errors.
2. Navigate to each major page:
   - Global Economy
   - Firms
   - Corporations
   - Products
   - Transportation
   - World Map
   - Market Activity
   - Feed
   - Cities
3. Confirm each page renders expected primary UI elements.

### B. Functional Tests
1. Start simulation and verify time progression updates visible metrics.
2. Verify firm-related data updates after simulation ticks.
3. Verify product views show expected pricing/availability values.
4. Verify transportation routes/cost-related data appears and updates.
5. Verify transaction/market activity entries populate over time.
6. Verify dashboard summaries remain consistent when switching pages.

### C. Data Integrity Checks
1. Compare key displayed values against known seed expectations.
2. Ensure no NaN/undefined/empty placeholders in key tables/cards.
3. Refresh the page and confirm deterministic behavior for seeded state (if applicable).

### D. Resilience / Longevity
1. Run the simulation continuously for 15-30 minutes.
2. Monitor for UI freezes, runaway memory usage symptoms, or stalled updates.
3. Confirm controls remain responsive after extended run.

### E. Basic Cross-Browser Check
1. Repeat smoke tests in Firefox.
2. Note any rendering or behavior differences.

## 5. Exit Criteria
- All smoke tests pass.
- No critical or high-severity defects remain open.
- Functional flows complete without data corruption.
- Any known issues are documented with severity and workaround.

## 6. Defect Reporting Template
For each issue, capture:
- Title
- Environment (URL, browser, timestamp)
- Steps to reproduce
- Expected result
- Actual result
- Severity (Critical/High/Medium/Low)
- Screenshot or screen recording
- Console/network errors (if present)

## 7. Execution Checklist
- [ ] Smoke tests completed
- [ ] Functional tests completed
- [ ] Data integrity checks completed
- [ ] 15-30 minute resilience run completed
- [ ] Cross-browser check completed
- [ ] Defects logged and triaged
- [ ] Final sign-off recorded
