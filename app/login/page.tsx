"use client"; // This tells Next.js this is a browser-based component
import { useState , useEffect } from "react";
import { auth } from "@/lib/firebase"; 
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail , onAuthStateChanged} from "firebase/auth";

export default function LoginPage() {
  const [email, setEmail] = useState(""); // a state variable for email
  const [password, setPassword] = useState(""); // a state variable for password
  const router = useRouter();


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push("/"); // If logged in, go to Chat
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleRegister = async () => {
    // checks if the email belongs to HS RheinMain, using a regular expression.
    if (!email.endsWith("@student.hs-rm.de")) { //@student.hs-rm.de
      alert("Please use your HS RheinMain email address!");
      return;
    }
    try {
      await createUserWithEmailAndPassword(auth, email, password); // we are using an async function to create a user, becasue we need to wait for Firebase to respond
      alert("User created! You can now log in.");
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
        alert("Logged in successfully!");
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleReset = async () => {
    // REQUIREMENT: Password Reset
    if (!email) return alert("Enter email first!");
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Reset email sent!");
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-10 max-w-sm mx-auto">
      <h1 className="text-2xl font-bold">HSRM Chat Login</h1>
      <input 
        type="email" placeholder="Email" className="border p-2 rounded"
        onChange={(e) => setEmail(e.target.value)} 
      />
      <input 
        type="password" placeholder="Password" className="border p-2 rounded"
        onChange={(e) => setPassword(e.target.value)} 
      />
      <div className="flex gap-2">
        <button onClick={handleLogin} className="bg-blue-500 text-white p-2 flex-1 rounded">Login</button>
        <button onClick={handleRegister} className="bg-green-500 text-white p-2 flex-1 rounded">Register</button>
      </div>
      <button onClick={handleReset} className="text-sm text-gray-500 underline">Forgot Password?</button>
    </div>
  );
}