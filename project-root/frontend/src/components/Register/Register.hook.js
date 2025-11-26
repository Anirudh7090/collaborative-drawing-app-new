import { useState } from "react";

// Your FastAPI register endpoint:
const REGISTER_API_URL = "http://localhost:8000/register";

export function useRegister(onRegisterSuccess) {
  const [registerData, setRegisterData] = useState({ email: '', password: '', fullName: '' });

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(REGISTER_API_URL, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerData),
      });
      if (response.ok) {
        alert("Registration successful! Please login.");
        if (typeof onRegisterSuccess === "function") {
          onRegisterSuccess();
        }
      } else {
        const error = await response.json();
        alert("Registration failed: " + (error.detail || "Unknown error"));
      }
    } catch (err) {
      alert("Registration failed - network error.");
    }
  };

  return { registerData, setRegisterData, handleRegister };
}
