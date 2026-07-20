# Implementation Steps - Upload Progress Enhancement

## Step 1: Create `app/components/UploadProgress.tsx`
- [x] Create step-based progress component with stages:
  - Uploading CSV...
  - Parsing dataset...
  - Computing statistics...
  - Generating AI summary...
  - Finalizing dashboard...
- [x] Show only one active stage at a time with animated loading indicator
- [x] Show checkmark for completed stages
- [x] Show error state with X icon when upload fails
- [x] Accept `currentStage` prop and `error` prop

## Step 2: Update `app/page.tsx`
- [x] Import and use `UploadProgress` component
- [x] Add stage state machine (`useRef` for elapsed time tracking + `useState` for current stage)
- [x] Replace existing `isUploading` Spinner + skeleton loader with `UploadProgress`
- [x] Prevent duplicate uploads using `processingRef`
- [x] Handle errors gracefully — map to the failed stage

## Step 3: Verify and test
- [x] Build runs successfully
- [x] All existing functionality preserved

