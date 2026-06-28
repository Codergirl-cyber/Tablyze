"use client";

//import { Black_And_White_Picture } from "next/font/google";
import { useState } from "react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);

 const uploadFile = async () => {

  console.log("uploadFile called");
  console.log("Current file:", file);
  try {
    if (!file) {
      console.log("No file selected");
      return;
    }

    console.log("Uploading file...");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("http://localhost:8000/upload", {
      method: "POST",
      body: formData,
    });

    console.log("Response status:", res.status);

    const data = await res.json();
    console.log("Response data:", data);

    setResult(data);
  } catch (err) {
    console.error("Upload failed:", err);
  }
};
  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-black bg-gray-50 p-6">
      <div className="bg-white shadow-md rounded-xl p-6 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4">Tablyze</h1>

       <input
  type="file"
  accept=".csv"
  onChange={(e) => {
  const selectedFile = e.target.files?.[0] || null;
  console.log("Selected file:", selectedFile);
  setFile(selectedFile);
}}
  className="mb-4"
/>

    <button 
  onClick={() => {
    console.log("BUTTON CLICKED",);
    uploadFile();
  }}
>
  Upload
</button>
        {result && (
          <pre className="mt-4 text-sm text-black bg-gray-100 p-3 rounded overflow-x-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
    </main>
  );
}