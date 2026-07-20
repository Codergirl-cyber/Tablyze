# UI Polish TODO

## Phase 1: Design Token Standardization ✅
- [x] Fix body font to use Geist sans via CSS variables
- [x] Add CSS custom properties for border-radius and spacing
- [x] Update metadata title/description in layout.tsx

## Phase 2: Component Polish ✅
- [x] SectionCard — Standardize border radius to rounded-xl, consistent padding
- [x] StatCard — Standardize border radius to rounded-xl, consistent padding
- [x] KeyValueTable — Add scope="col" to headers, improve empty state
- [x] AiSummaryCard — Improve empty/error states, consistent radius
- [x] UploadProgress — Add aria-live="polite" for announcements
- [x] CorrelationHeatmap — Fix empty state text color
- [x] DataTypesPieChart — Improve empty state styling
- [x] MissingValuesBarChart — Improve empty state styling
- [x] Skeleton components — Consistent border-radius (rounded-lg)

## Phase 3: page.tsx Polish ✅
- [x] Fix upload dropzone border radius (rounded-3xl → rounded-xl)
- [x] Standardize empty state styling with rounded-xl
- [x] Improve error state with icon + role="alert"
- [x] Memoize uploadFile with useCallback
- [x] Remove unused console.log statements
- [x] Add useCallback import

## Phase 4: Remove Unused Code
- [x] Remove unused Spinner import
- [ ] Remove Spinner.tsx component file
- [ ] Clean up supabase.ts if unused in frontend

## Phase 5: Responsive & Accessibility ✅
- [x] Add aria-live regions for upload/processing states
- [x] Add scope attributes to table headers everywhere
- [x] Add global focus-visible styles for keyboard navigation

