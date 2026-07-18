from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
import traceback
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from dotenv import load_dotenv
import os
from groq import Groq

# Load environment variables from .env
load_dotenv()

# Initialize Groq client
groq_client = None
try:
    groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
except Exception as e:
    # Delay failure: log the error and allow the app to run without Groq.
    # generate_summary will handle a missing client gracefully.
    print("Warning: Groq client initialization failed:", str(e))

app = FastAPI()

# Allow frontend (Next.js)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000","https://tablyze.vercel.app",],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def generate_summary(stats: dict) -> str:
    """
    Generate a professional data summary using the Groq Chat Completions API.
    
    Args:
        stats: Dictionary containing dataset statistics (rows, columns, missing_values, 
               numeric_summary, correlation_matrix, etc.)
    
    Returns:
        A string containing the generated summary or a friendly error message.
    """
    try:
        # Format statistics for the LLM
        summary_text = f"""
Dataset Overview:
- Total Rows: {stats.get('rows', 'N/A')}
- Total Columns: {stats.get('columns', 'N/A')}
- Column Names: {', '.join(stats.get('column_names', []))}

Missing Values:
{format_missing_values(stats.get('missing_values', {}))}

Numeric Summary:
{format_numeric_summary(stats.get('numeric_summary', {}))}

Correlation Matrix (strong correlations only):
{format_correlations(stats.get('correlation_matrix', {}))}

Data Types:
{', '.join([f'{col}: {dtype}' for col, dtype in stats.get('dtypes', {}).items()])}
"""
        
        prompt = f"""You are a professional data analyst.

Analyze these dataset statistics:

{summary_text}

Your summary should:
- Mention dataset size.
- Highlight missing values.
- Mention strong correlations if present.
- Suggest possible preprocessing steps.
- Avoid speculation or unsupported conclusions.
- Keep the response concise (5–8 bullet points).

Provide your analysis as a bulleted list."""
        
        # Call Groq API with low temperature for consistency
        message = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
        )
        
        # Extract and return the summary text
        return message.choices[0].message.content
        
    except Exception as e:
        return f"Unable to generate summary at this moment. Error: {str(e)}"


def format_missing_values(missing_values: dict) -> str:
    """Format missing values data for the summary."""
    if not missing_values:
        return "- No missing values detected."
    
    items = [f"  - {col}: {count} missing" for col, count in missing_values.items() if count > 0]
    if not items:
        return "- No missing values detected."
    return "\n".join(items)


def format_numeric_summary(numeric_summary: dict) -> str:
    """Format numeric summary statistics for the summary."""
    if not numeric_summary:
        return "- No numeric columns found."
    
    lines = []
    for col, stats in numeric_summary.items():
        lines.append(f"  - {col}: mean={stats.get('mean', 'N/A')}, std={stats.get('std', 'N/A')}, "
                     f"min={stats.get('min', 'N/A')}, max={stats.get('max', 'N/A')}")
    return "\n".join(lines) if lines else "- No numeric columns found."


def format_correlations(correlation_matrix: dict) -> str:
    """Format strong correlations (>0.7 or <-0.7) for the summary."""
    if not correlation_matrix:
        return "- No correlations calculated."
    
    strong_correlations = []
    seen_pairs = set()
    
    for col1, correlations in correlation_matrix.items():
        for col2, corr_value in correlations.items():
            if corr_value is None or col1 == col2:
                continue
            
            # Avoid duplicate pairs
            pair = tuple(sorted([col1, col2]))
            if pair in seen_pairs:
                continue
            
            # Only show strong correlations
            if abs(corr_value) > 0.7:
                strong_correlations.append(f"  - {col1} ↔ {col2}: {corr_value:.2f}")
                seen_pairs.add(pair)
    
    if not strong_correlations:
        return "- No strong correlations detected."
    return "\n".join(strong_correlations)


@app.get("/")
def home():
    return {"status": "backend running"}

@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    def to_jsonable(val):
        # Minimal helper to keep JSON-serializable output for pandas/numpy scalars
        if pd.isna(val):
            return None
        if hasattr(val, "item"):
            try:
                return val.item()
            except Exception:
                pass
        return val

    try:
        df = pd.read_csv(file.file)

        total_rows = len(df)
        missing_series = df.isna().sum(axis=0)

        missing_values = {}
        for col in df.columns:
            missing_count = int(missing_series[col])
            missing_values[str(col)] = missing_count

        numeric_df = df.select_dtypes(include=["number"])

        # Correlation matrix (numeric columns only). If <2 numeric columns, return empty.
        correlation_matrix = {}
        if numeric_df.shape[1] >= 2:
            corr = numeric_df.corr(numeric_only=True)
            correlation_matrix = {
                str(col): {str(c2): to_jsonable(val) for c2, val in corr.loc[col].items()}
                for col in corr.columns
            }


        

        numeric_summary = {}
        iqr_outliers = {}

        for col in numeric_df.columns:
            s = numeric_df[col]

            count = int(s.count())

            q1 = (
                to_jsonable(s.quantile(0.25, interpolation="linear"))
                if count > 0
                else None
            )
            q3 = (
                to_jsonable(s.quantile(0.75, interpolation="linear"))
                if count > 0
                else None
            )

            # IQR outlier bounds using Tukey's rule (1.5 * IQR)
            if q1 is None or q3 is None:
                iqr = None
                lower_bound = None
                upper_bound = None
                outlier_count = 0
            else:
                iqr_val = q3 - q1
                lower_bound_val = q1 - 1.5 * iqr_val
                upper_bound_val = q3 + 1.5 * iqr_val

                # Count outliers excluding NaNs
                outlier_count = int(
                    ((s < lower_bound_val) | (s > upper_bound_val)).sum()
                )

                iqr = to_jsonable(iqr_val)
                lower_bound = to_jsonable(lower_bound_val)
                upper_bound = to_jsonable(upper_bound_val)

            stats = {
                "count": count,
                "mean": to_jsonable(s.mean()),
                "std": to_jsonable(s.std()),
                "min": to_jsonable(s.min()),
                "25%": q1,
                "50%": to_jsonable(s.quantile(0.50, interpolation="linear")) if count > 0 else None,
                "75%": q3,
                "max": to_jsonable(s.max()),
            }
            numeric_summary[str(col)] = stats

            iqr_outliers[str(col)] = {
                "q1": q1,
                "q3": q3,
                "iqr": iqr,
                "lower_bound": lower_bound,
                "upper_bound": upper_bound,
                "outlier_count": outlier_count,
            }


        # Top 5 most frequent values for each categorical (non-numeric) column
        categorical_df = df.select_dtypes(exclude=["number"])
        categorical_top_frequencies = {}
        for col in categorical_df.columns:
            s = categorical_df[col]
            vc = s.value_counts(dropna=True).head(5)
            categorical_top_frequencies[str(col)] = [
                {"value": to_jsonable(idx), "count": int(cnt)}
                for idx, cnt in vc.items()
            ]

        # Create stats dictionary for AI summary generation
        stats = {
            "rows": df.shape[0],
            "columns": df.shape[1],
            "column_names": list(df.columns),
            "dtypes": df.dtypes.astype(str).to_dict(),
            "missing_values": missing_values,
            "numeric_summary": numeric_summary,
            "correlation_matrix": correlation_matrix,
        }

        # Generate AI summary
        try:
            ai_summary = generate_summary(stats)
        except Exception:
            ai_summary = "AI summary unavailable."

        return {
            "rows": df.shape[0],
            "columns": df.shape[1],
            "column_names": list(df.columns),
            "dtypes": df.dtypes.astype(str).to_dict(),
            "missing_values": missing_values,
            "numeric_summary": numeric_summary,
            "iqr_outliers": iqr_outliers,
            "correlation_matrix": correlation_matrix,
            "categorical_top_frequencies": categorical_top_frequencies,
            "ai_summary": ai_summary,
        }




    except Exception as e:
            # Log full traceback for easier debugging in server logs
            traceback.print_exc()
            return JSONResponse(content={"error": str(e)}, status_code=500)
