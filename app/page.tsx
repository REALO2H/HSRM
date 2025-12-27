"use client";
import { useState, useEffect, useRef } from "react";
import { auth, db } from "@/lib/firebase"; 
import { onAuthStateChanged } from "firebase/auth";
import { ref, push, onValue, query, limitToLast, remove } from "firebase/database";
import { useRouter } from "next/navigation";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [totalMessages, setTotalMessages] = useState(0);
  const [limitCount, setLimitCount] = useState(50); // Initial limit of messages to load


  const router = useRouter();
  const scrollContainerRef = useRef<HTMLDivElement>(null); // To "watch" the scrollbar

  // 1. Requirement: Track the logged-in user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        // 3. REDIRECTION: If no user is found, kick them to the login page
        router.push("/login");
      } else {
        setUser(currentUser);
      }
    });
    return () => unsubscribe();
  }, [router]);

  // 2. Requirement: Efficiency - Listen for ONLY the last 50 messages
  useEffect(() => {
    if (!user) return;

    const messagesRef = ref(db, "messages");

    const q = query(messagesRef, limitToLast(limitCount));

    const unsubscribe = onValue(q, (snapshot) => {

    const data = snapshot.val();

  if (data) {
      // If messages exist, convert the object to an array
      const messageList = Object.entries(data).map(([id, val]: any) => ({
        id,
        ...val,
      }));
      setMessages(messageList);
    } else {
      // CRITICAL: If no messages are left (or all were deleted), 
      // you MUST clear the state, otherwise the UI stays full!
      setMessages([]);
    }
  });

    return () => unsubscribe();
  }, [user,limitCount]);

  // 3. Requirement: Sending logic
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user ) return;

    await push(ref(db, "messages"), {
      text: inputText,
      uid: user.uid, // Required for security rules
      email: user.email,
      timestamp: Date.now(),
    });
    setInputText("");
  };

  // 4. Requirement: Allow deleting own messages
  // const deleteMsg = (id: string) => {
  //   remove(ref(db, `messages/${id}`));
  // };

  const deleteMsg = (id: string) => {
  console.log("Attempting to delete ID:", id); // Verify this isn't empty!
  if (!id) return;
  
  // The path must be specific: messages/ID
  const messageRef = ref(db, `messages/${id}`);
  remove(messageRef).catch((error) => {
    console.error("Delete failed:", error.message);
  });
};

useEffect(() => {
  const messagesRef = ref(db, "messages");
  
  // This listener gets the WHOLE count but doesn't download the content of old messages
  const unsubscribe = onValue(messagesRef, (snapshot) => {
    setTotalMessages(snapshot.size); // Returns the total number of children
  });

  return () => unsubscribe();
}, []);


const handleScroll = () => {
  const container = scrollContainerRef.current;
  if (!container) return;

  // 1. Check if we are at the top
  if (container.scrollTop < 50) {
    
    // 2. THE GUARD: Only trigger if we haven't loaded everything yet
    if (limitCount < totalMessages) {
      console.log(`Loading more... currently showing ${limitCount} of ${totalMessages}`);
      setLimitCount((prev) => prev + 50);
    } else {
      console.log("All messages loaded. Stopping trigger.");
    }
  }
};

  if (!user) return <div className="p-10">Please log in to see the chat.</div>;

return (
  <main className="flex flex-col h-screen max-w-2xl mx-auto bg-slate-50 shadow-2xl font-sans">
    {/* Header: Professional Contrast */}
    <header className="p-4 bg-white border-b shadow-sm">
      <h1 className="text-lg font-extrabold text-slate-800 tracking-tight">
        HSRM <span className="text-blue-600">Chat</span>
      </h1>
      <p className="text-xs text-slate-500 font-medium truncate">Logged in: {user.email}</p>
    </header>

    {/* Message Container: Improved Spacing */}
    <div 
      ref={scrollContainerRef} 
      onScroll={handleScroll} 
      className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col bg-[#f8fafc]"
    >
      {messages.map((msg) => {
        const isMe = msg.uid === user.uid;
        
        return (
          <div 
            key={msg.id} 
            className={`flex flex-col ${isMe ? "items-end" : "items-start animate-in fade-in slide-in-from-left-2"}`}
          >
            {/* Sender Label */}
            <span className="text-[10px] font-bold text-slate-400 mb-1 px-1 uppercase tracking-widest">
              {isMe ? "You" : msg.email.split('@')[0]}
            </span>

            {/* Message Bubble: Dynamic Colors */}
            <div 
              className={`relative px-4 py-2.5 rounded-2xl text-sm shadow-sm max-w-[85%] sm:max-w-[70%] leading-relaxed ${
                isMe 
                  ? "bg-blue-600 text-white rounded-tr-none border border-blue-700" 
                  : "bg-white text-slate-700 rounded-tl-none border border-slate-200"
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{msg.text}</p>
              
              {/* Delete Button: Better Visibility for You */}
              {isMe && (
                <button 
                  onClick={() => deleteMsg(msg.id)}
                  className="mt-2 block text-[10px] font-bold text-blue-200 hover:text-white transition-colors duration-200 uppercase tracking-tighter"
                >
                  Delete Message
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>

    {/* Input Form: Modern Field styling */}
    <form onSubmit={sendMessage} className="p-4 bg-white border-t border-slate-100 flex gap-3 items-center">
      <input 
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        className="flex-1 bg-slate-100 border-none p-3 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 transition-all outline-none" 
        placeholder="Type a message..." 
      />
      <button 
        type="submit" 
        disabled={!inputText.trim()}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-md active:scale-95"
      >
        Send
      </button>
    </form>
  </main>
);
}