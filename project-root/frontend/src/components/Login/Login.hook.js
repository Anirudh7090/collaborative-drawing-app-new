import { useState } from "react";

// Your FastAPI login endpoint:
const LOGIN_API_URL = "http://localhost:8000/login";

export function useLogin(onLoginSuccess) {
  const [loginData, setLoginData] = useState({ email: '', password: '' });

  // Business logic: handle form submit/API
  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(LOGIN_API_URL, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      });

      if (response.ok) {
        const result = await response.json();
        alert("Logged in successfully!");
        // Notify parent (App.js) of login success
        if (typeof onLoginSuccess === "function") {
          onLoginSuccess(result);
        }
      } else {
        const error = await response.json();
        alert("Login failed: " + (error.detail || "Unknown error"));
      }
    } catch (err) {
      alert("Login failed - network error.");
    }
  };

  return { loginData, setLoginData, handleLogin };
}
