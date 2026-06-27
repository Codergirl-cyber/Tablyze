"use client";

import { useState } from "react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);

  const uploadFile = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("http://localhost:8000/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setResult(data);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      <div className="bg-white shadow-md rounded-xl p-6 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4">TabExplain</h1>

        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="mb-4"
        />

        <button
          onClick={uploadFile}
          className="w-full bg-black text-white py-2 rounded hover:bg-gray-800"
        >
          Upload CSV
        </button>

        {result && (
          <pre className="mt-4 text-sm bg-gray-100 p-3 rounded overflow-x-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
    </main>
  );
}