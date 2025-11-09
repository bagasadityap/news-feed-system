"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import type { Post } from "./page";

interface CreatePostProps { show: boolean; onClose: () => void; token: string | null; onPost: (newPost: Post) => void; userId: number | null; username: string; }

export default function CreatePost({ show, onClose, token, onPost, userId, username }: CreatePostProps) {
  const [newPost, setNewPost] = useState("");
  const [charCount, setCharCount] = useState(0);

  const handlePost = async (): Promise<void> => {
    if (!newPost.trim() || !token || !userId) return;
    try {
      const res = await fetch("https://news-feed-system-backend-production.up.railway.app/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: newPost }),
      });
      if (!res.ok) throw new Error("Failed to create post");
      const created: { id: number; content: string; CreatedAt: string; user_id?: number } = await res.json();
      const post: Post = { id: created.id, content: created.content, CreatedAt: created.CreatedAt, User: { id: userId, username }, isFollowing: false };
      onPost(post);
      setNewPost(""); setCharCount(0); onClose();
    } catch (err) {
      console.error("Error creating post:", err);
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold mb-3 text-gray-800">Create Post</h2>
            <Textarea value={newPost} onChange={(e) => { const val = e.target.value.slice(0, 200); setNewPost(val); setCharCount(val.length); }} placeholder="What's on your mind?" rows={4} className="w-full border rounded-xl p-3" />
            <div className="flex justify-between items-center mt-3">
              <span className={`text-sm ${charCount >= 200 ? "text-red-500" : "text-gray-400"}`}>{charCount}/200</span>
              <div className="space-x-2"><Button variant="outline" onClick={onClose} className="rounded-lg">Cancel</Button><Button onClick={handlePost} disabled={!newPost.trim()} className="bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Post</Button></div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
