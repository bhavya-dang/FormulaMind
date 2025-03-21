"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/app/context/ThemeContext";
import Cookies from "js-cookie";
import "dotenv/config";
export default function LoginPage() {
  const [secretKey, setSecretKey] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const { isDarkMode } = useTheme();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (secretKey === process.env.NEXT_PUBLIC_ACCESS_KEY) {
      // Set cookie with 7 days expiry
      Cookies.set("formulamind_access", "true", { expires: 7 });
      router.push("/");
    } else {
      setError("Invalid access key");
    }
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? "bg-black/95" : "bg-white"
      }`}
    >
      <div
        className={`p-8 rounded-lg shadow-lg max-w-md w-full ${
          isDarkMode ? "bg-gray-800/50" : "bg-white"
        }`}
      >
        <h1
          className={`text-2xl font-bold mb-6 text-center ${
            isDarkMode ? "text-white" : "text-gray-900"
          }`}
        >
          FormulaMind Access
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="secretKey"
              className={`block text-sm font-medium mb-2 ${
                isDarkMode ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Enter Access Key
            </label>
            <input
              type="password"
              id="secretKey"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 ${
                isDarkMode
                  ? "bg-gray-800/30 text-white border-gray-700 focus:ring-gray-600"
                  : "bg-white text-gray-900 border-gray-300 focus:ring-gray-300"
              }`}
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full bg-violet-600 text-white py-2 px-4 rounded-lg hover:bg-violet-700 transition-colors hover:cursor-pointer"
          >
            Access App
          </button>
        </form>
      </div>
    </div>
  );
}
