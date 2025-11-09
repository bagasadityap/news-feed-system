"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const toggleMode = (): void => {
    setMessage("");
    setIsLogin(!isLogin);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const formData = new FormData(e.currentTarget);
    const username = String(formData.get("username") || "").trim();
    const password = String(formData.get("password") || "").trim();
    const passwordConfirmation = String(formData.get("passwordConfirmation") || "").trim();

    if (!username || !password) {
      setMessage("Username and password are required.");
      setLoading(false);
      return;
    }

    if (!isLogin && password !== passwordConfirmation) {
      setMessage("Password confirmation does not match.");
      setLoading(false);
      return;
    }

    const endpoint = isLogin
      ? "https://news-feed-system-backend-production.up.railway.app/api/login"
      : "https://news-feed-system-backend-production.up.railway.app/api/register";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data: { token?: string; error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error || "Unexpected error occurred.");

      if (isLogin && data.token) {
        localStorage.setItem("token", data.token);
        setMessage("Login successful. Redirecting...");
        setTimeout(() => router.push("/feed"), 800);
      } else {
        setMessage("Registration successful. Please log in.");
        setIsLogin(true);
      }
    } catch (err) {
      if (err instanceof Error) setMessage("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Card className="backdrop-blur-xl bg-white/90 shadow-2xl rounded-2xl border-none">
          <CardHeader className="text-center">
            <h1 className="text-3xl font-bold text-gray-800">{isLogin ? "Sign In" : "Create Account"}</h1>
            <p className="text-sm text-gray-500 mt-2">
              {isLogin ? "Enter your credentials to continue" : "Fill in the details to create your account"}
            </p>
          </CardHeader>

          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <Input placeholder="Username" type="text" className="p-3 rounded-xl" name="username" />

              <div className="flex gap-3">
                <Input placeholder="Password" type="password" className="p-3 rounded-xl flex-1" name="password" />
                {!isLogin && <Input placeholder="Confirm" type="password" className="p-3 rounded-xl flex-1" name="passwordConfirmation" />}
              </div>

              {message && (
                <p className={`text-sm ${message.startsWith("Login") || message.startsWith("Registration") ? "text-green-600" : "text-red-600"}`}>
                  {message}
                </p>
              )}

              <Button type="submit" disabled={loading} className="w-full bg-indigo-500 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-all duration-200">
                {loading ? (isLogin ? "Logging in..." : "Registering...") : isLogin ? "Login" : "Register"}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="text-center">
            <p className="text-sm text-gray-600">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button onClick={toggleMode} className="text-indigo-500 hover:underline font-medium">
                {isLogin ? "Register" : "Login"}
              </button>
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
