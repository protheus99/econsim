# Rollback Plan: Remove IndexedDB Save System

## Summary
Roll back the IndexedDB persistence changes and restore the original sessionStorage-only approach. Also remove the alpha/ server directory.

## Files to Delete
- [ ] `js/core/GameStorage.js` - IndexedDB storage manager
- [ ] `alpha/` directory - Entire server refactor

## Files to Revert

### 1. `js/core/SimulationEngine.js`
Changes to remove:
- [ ] Remove import: `import { gameStorage } from './GameStorage.js';`
- [ ] Remove from `initialize()`: gameStorage.initialize() call
- [ ] Remove from `setupIntervals()`: autosaveInterval setup
- [ ] Remove all new methods after `clearSavedState()`:
  - `getSerializableState()`
  - `saveToSlot()`
  - `autosave()`
  - `loadFromSlot()`
  - `loadLatestSave()`
  - `applyState()`
  - `listSaves()`
  - `deleteSave()`
  - `getStorageStats()`

### 2. `js/pages/shared.js`
Changes to remove:
- [ ] Remove save/load button handlers from `setupControls()`
- [ ] Remove all modal functions:
  - `openSaveLoadModal()`
  - `closeSaveLoadModal()`
  - `setupModalEventListeners()`
  - `refreshSavesList()`
  - `loadSave()`
  - `deleteSave()`
- [ ] Remove modal state variables (`currentSimulation`, `modalMode`)

### 3. `index.html`
Changes to remove:
- [ ] Remove Save/Load buttons from nav-controls
- [ ] Remove entire save-load-modal div

### 4. `css/styles.css`
Changes to remove:
- [ ] Remove entire "Save/Load Modal and Buttons" section (~260 lines at end)

## Approach
Use `git checkout` to restore original versions where possible, or manually edit to remove specific changes.

## Verification
- [ ] Simulation runs without errors
- [ ] No references to GameStorage or IndexedDB
- [ ] Cross-page navigation still works via sessionStorage
