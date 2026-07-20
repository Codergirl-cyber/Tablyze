# Skeleton Loading Placeholders — Progress Tracker

## Steps

- [x] Step 1: Create `app/components/Skeleton.tsx` — Reusable skeleton primitives
- [x] Step 2: Create `app/components/StatCardSkeleton.tsx` — Skeleton matching StatCard
- [x] Step 3: Create `app/components/ChartSkeleton.tsx` — Skeleton for chart areas
- [x] Step 4: Create `app/components/TableSkeleton.tsx` — Skeleton for KeyValueTable
- [x] Step 5: Edit `app/page.tsx` — Conditionally render skeletons during upload in same grid layout

## Done

All skeleton components created. Page.tsx updated to show skeletons during `isUploading` state.

- ✅ `StatCardSkeleton` — 4-card grid with pulsing bars matching StatCard padding
- ✅ `ChartSkeleton` — Decorative bar icon + label in chart-sized container (h-[220px] sm:h-[320px])
- ✅ `TableSkeleton` — Configurable header + rows with alternating backgrounds
- ✅ Page.tsx renders full skeleton layout during upload:
  - 4 StatCard skeletons in grid-cols-4
  - Missing Values SectionCard skeleton (chart + 5-row 2-column table)
  - Data Types SectionCard skeleton (chart only)
  - Correlation Heatmap SectionCard skeleton (chart)
  - Summary Statistics SectionCard skeleton (9-column table, 4 rows)
  - AI Summary SectionCard skeleton (3-line text block)
- ⚠️ `Skeleton.tsx` created as reusable primitive library (SkeletonBar, SkeletonCircle, SkeletonBlock, SkeletonText)

