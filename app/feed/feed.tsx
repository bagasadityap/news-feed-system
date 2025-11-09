"use client";

import { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import type { Post } from "./page";

interface FeedListProps {
  posts: Post[];
  loading: boolean;
  token: string | null;
  setPosts: Dispatch<SetStateAction<Post[]>>;
}

export default function FeedList({ posts, loading, token, setPosts }: FeedListProps) {
  const toggleFollow = async (userId: number, isFollowing: boolean): Promise<void> => {
    if (!token) return;
    const endpoint = `https://news-feed-system-backend-production.up.railway.app/api/follow/${userId}`;
    try {
      const res = await fetch(endpoint, { method: isFollowing ? "DELETE" : "POST", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to update follow state");
      setPosts((prev) => prev.map((p) => p.user_id === userId ? { ...p, isFollowing: !p.isFollowing } : p));
    } catch (err) {
      console.error("Error toggling follow:", err);
    }
  };

  if (loading) return <p className="text-center text-gray-500 py-10">Loading feed...</p>;
  if (posts.length === 0) return <p className="text-center text-gray-400 py-10">No posts yet</p>;

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <div key={post.id} className="bg-gray-100 rounded-xl p-4 shadow hover:shadow-lg transition">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-800">{post.User?.username ?? `User ${post.user_id}`}</span>
            <button onClick={() => toggleFollow(post.user_id, post.isFollowing)} className={`text-sm px-3 py-1 rounded-lg font-medium transition ${post.isFollowing ? "bg-gray-200 text-gray-700 hover:bg-gray-300" : "bg-indigo-500 text-white hover:bg-indigo-600"}`}>{post.isFollowing ? "Unfollow" : "Follow"}</button>
          </div>
          <p className="mt-3 text-gray-700">{post.content}</p>
          <p className="text-xs text-gray-400 mt-2">{new Date(post.CreatedAt).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}
