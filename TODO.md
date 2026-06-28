- [x] Update FastAPI /upload endpoint to add IQR-based outlier detection for every numeric column
  - [x] Compute Q1, Q3, IQR per numeric column
  - [x] Compute lower/upper bounds using 1.5*IQR
  - [x] Count outliers below/above bounds (excluding NaNs)
  - [x] Add non-breaking response field `iqr_outliers` to JSON
- [x] Verify JSON-serializability

- [x] (Optional) Run backend and manually upload sample.csv to confirm output includes `iqr_outliers`



