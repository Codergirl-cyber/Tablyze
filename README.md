# 📊 Tablyze

Tablyze is an AI-powered CSV analysis tool that lets you upload datasets, instantly visualize key statistics, and generate human-readable insights using AI.

Built with **Next.js**, **FastAPI**, **Pandas**, **Plotly**, and **Groq AI**.

---

## ✨ Features

- 📂 Upload CSV files
- 📈 Interactive dashboard
- 📊 Summary statistics
- 🔍 Missing value analysis
- 📉 Correlation heatmap
- 📦 Data type detection
- 🤖 AI-generated dataset summary (Groq)
- ⚡ Fast API backend
- 🎨 Modern responsive UI

---

## 🛠️ Tech Stack

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS
- Recharts

### Backend
- FastAPI
- Pandas
- NumPy
- Uvicorn

### AI
- Groq API
- Llama 3

---

## 📸 Screenshots

> upcoming...

```
/screenshots
    dashboard.png
    upload.png
    summary.png
```

---

## 🚀 Getting Started

### Clone the repository

```bash
git clone https://github.com/yourusername/tablyze.git
cd tablyze
```

---

## Backend Setup

```bash
cd backend

python -m venv venv

# Windows
venv\Scripts\activate

pip install -r requirements.txt

uvicorn main:app --reload
```

Backend runs on:

```
http://localhost:8000
```

---

## Frontend Setup

```bash
npm install
npm run dev
```

Frontend runs on:

```
http://localhost:3000
```

---

## Environment Variables

Create a `.env` file inside the backend folder.

```env
GROQ_API_KEY=your_api_key_here
```

---

## Project Structure

```
tablyze/
│
├── app/
├── components/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── .env
│
├── public/
├── screenshots/
└── README.md
```

---

## How It Works

1. Upload a CSV file.
2. FastAPI processes the dataset using Pandas.
3. Statistical summaries are generated.
4. Correlations and missing values are computed.
5. A compact JSON summary is sent to Groq.
6. AI returns a natural-language explanation.
7. Results are displayed in an interactive dashboard.

---

## Example AI Input

```json
{
  "rows": 891,
  "columns": 12,
  "missing": {
    "Age": 177,
    "Cabin": 687
  },
  "correlations": {
    "Fare-Pclass": -0.55
  }
}
```

---

## Future Improvements

- Export reports as PDF
- More visualization types
- Multiple dataset comparison
- User authentication
- Drag-and-drop upload
- AI recommendations for preprocessing

---

## Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Open a Pull Request

---

## License

This project is licensed under the MIT License.

---

## Author

**Shruti Bhute**

If you found this project useful, consider giving it a ⭐ on GitHub.
