"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { TbPencilPlus } from "react-icons/tb";
import { IoNewspaperOutline } from "react-icons/io5";
import { Button } from "@/components/ui/button";
import CreatePost from "./create-post";
import { toast } from "sonner";

export interface User {
  id: number;
  username: string;
}

export interface Post {
  id: number;
  content: string;
  CreatedAt: string;
  user_id?: number;
  User: User;
  isFollowing: boolean;
}

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<"all" | "following">("all");
  const [followingIds, setFollowingIds] = useState<number[]>([]);
  const [loggedInUserId, setLoggedInUserId] = useState<number | null>(null);
  const [loggedInUsername, setLoggedInUsername] = useState<string>("You");
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const observer = useRef<IntersectionObserver | null>(null);
  const lastPostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!token) return;
    try {
      const parts = token.split(".");
      if (parts.length < 2) return;
      const payload = JSON.parse(atob(parts[1])) as {
        user_id?: number | string;
      };
      const idNum =
        typeof payload.user_id === "string"
          ? parseInt(payload.user_id, 10)
          : Number(payload.user_id);
      if (!Number.isNaN(idNum)) setLoggedInUserId(idNum);
    } catch {
      console.warn("Invalid token");
    }
  }, [token]);

  const fetchFeed = useCallback(
    async (pageNum: number): Promise<void> => {
      if (!token || loading || !hasMore) return;
      try {
        setLoading(true);

        const followingRes = await fetch(
          "https://news-feed-system-backend-production.up.railway.app/api/following",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const followingJson: { following: number[] } = followingRes.ok
          ? await followingRes.json()
          : { following: [] };
        const followingData = followingJson.following || [];
        setFollowingIds(followingData);

        const userRes = await fetch("https://news-feed-system-backend-production.up.railway.app/api/users", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const userData: { count: number; users: User[] } =
          await userRes.json();
        const allUsers = userData.users;

        const feedRes = await fetch(
          `https://news-feed-system-backend-production.up.railway.app/api/feed?page=${pageNum}&limit=10`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!feedRes.ok) throw new Error("Failed to fetch feed");
        const feedJson: {
          page: number;
          posts: Array<{
            id: number;
            user_id: number;
            content: string;
            CreatedAt: string;
          }>;
        } = await feedRes.json();

        if (feedJson.posts.length === 0) {
          setHasMore(false);
          return;
        }

        const mapped = feedJson.posts.map((p) => {
          const user =
            allUsers.find((u) => u.id === p.user_id) || {
              id: p.user_id,
              username: "",
            };
          const isFollowing = followingData.includes(user.id);
          const isOwn = loggedInUserId !== null && user.id === loggedInUserId;
          if (isOwn) setLoggedInUsername(user.username);
          return {
            id: p.id,
            content: p.content,
            CreatedAt: p.CreatedAt,
            User: user,
            isFollowing,
          };
        });

        setPosts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newPosts = mapped.filter((p) => !existingIds.has(p.id));
          return [
            ...prev,
            ...newPosts.sort(
              (a, b) =>
                new Date(b.CreatedAt).getTime() -
                new Date(a.CreatedAt).getTime()
            ),
          ];
        });
      } catch (err) {
        console.error("Error fetching feed:", err);
      } finally {
        setLoading(false);
      }
    },
    [token, hasMore, loading, loggedInUserId]
  );

  useEffect(() => {
    if (token && loggedInUserId) fetchFeed(page);
  }, [token, loggedInUserId, page, fetchFeed]);

  useEffect(() => {
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        setPage((prev) => prev + 1);
      }
    });

    if (lastPostRef.current) {
      observer.current.observe(lastPostRef.current);
    }

    return () => observer.current?.disconnect();
  }, [loading, hasMore]);

  const handleCreate = (newPost: Post) => {
    const postWithTime = { ...newPost, CreatedAt: new Date().toISOString() };
    setPosts((prev) => [postWithTime, ...prev]);
    toast.success("Post uploaded successfully.");
  };

  const toggleFollow = async (
    userId: number,
    isFollowing: boolean
  ): Promise<void> => {
    if (!token) return;
    const endpoint = `https://news-feed-system-backend-production.up.railway.app/api/follow/${userId}`;
    try {
      const res = await fetch(endpoint, {
        method: isFollowing ? "DELETE" : "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error("Failed to update follow state");

      if (!isFollowing && data.message) toast.success(data.message);
      else if (isFollowing) toast.info("You unfollowed this user.");

      const updatedFollowing = isFollowing
        ? followingIds.filter((id) => id !== userId)
        : [...followingIds, userId];
      setFollowingIds(updatedFollowing);
      setPosts((prev) =>
        prev.map((p) =>
          p.User.id === userId ? { ...p, isFollowing: !isFollowing } : p
        )
      );
    } catch (err) {
      console.error("Error toggling follow:", err);
    }
  };

  const filteredPosts = posts.filter((p) =>
    filter === "following" ? p.isFollowing : true
  );

  const formatRelativeTime = (dateString: string): string => {
    const now = new Date();
    const then = new Date(dateString);
    const diff = (now.getTime() - then.getTime()) / 1000;

    if (isNaN(then.getTime())) return "Just now";
    if (diff < 60) return "Just now";
    if (diff < 3600)
      return `${Math.floor(diff / 60)} minute${
        Math.floor(diff / 60) > 1 ? "s" : ""
      } ago`;
    if (diff < 86400)
      return `${Math.floor(diff / 3600)} hour${
        Math.floor(diff / 3600) > 1 ? "s" : ""
      } ago`;
    if (diff < 604800)
      return `${Math.floor(diff / 86400)} day${
        Math.floor(diff / 86400) > 1 ? "s" : ""
      } ago`;

    return then.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-900 py-6">
      <div className="max-w-[80%] mx-auto bg-white rounded-2xl shadow-xl p-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="flex items-center gap-2 text-lg md:text-2xl font-bold text-gray-800">
            <IoNewspaperOutline className="text-yellow-500 w-5 md:w-8 h-8" />
            News Feed
          </h1>
          <div className="flex gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => setFilter("all")}
            >
              All
            </Button>
            <Button
              variant={filter === "following" ? "default" : "outline"}
              onClick={() => setFilter("following")}
            >
              Following
            </Button>
          </div>
        </div>

        {filteredPosts.length === 0 && !loading && (
          <p className="text-center text-gray-400 py-10">No posts yet</p>
        )}

        <div className="space-y-3">
          {filteredPosts.map((post, index) => (
            <div
              key={post.id}
              ref={index === filteredPosts.length - 1 ? lastPostRef : null}
              className="bg-gray-100 rounded-xl p-4 shadow hover:shadow-lg transition"
            >
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-800">
                  {post.User.username}
                </span>
                {loggedInUserId !== null && post.User.id !== loggedInUserId && (
                  <button
                    onClick={() =>
                      toggleFollow(post.User.id, post.isFollowing)
                    }
                    className={`text-sm px-3 py-1 rounded-lg font-medium transition ${
                      post.isFollowing
                        ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        : "bg-indigo-500 text-white hover:bg-indigo-600"
                    }`}
                  >
                    {post.isFollowing ? "Unfollow" : "Follow"}
                  </button>
                )}
              </div>
              <p className="mt-3 text-gray-700 break-words">{post.content}</p>
              <p className="text-xs text-gray-400 mt-2">
                {formatRelativeTime(post.CreatedAt)}
              </p>
            </div>
          ))}
        </div>

        {loading && (
          <p className="text-center text-gray-500 py-4">Loading more...</p>
        )}
      </div>

      <motion.button
        onClick={() => setShowModal(true)}
        className="fixed bottom-6 right-6 bg-indigo-600 text-white w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-2xl hover:bg-indigo-700"
        whileTap={{ scale: 0.9 }}
      >
        <TbPencilPlus />
      </motion.button>

      <CreatePost
        show={showModal}
        onClose={() => setShowModal(false)}
        token={token}
        onPost={handleCreate}
        username={loggedInUsername}
        userId={loggedInUserId}
      />
    </div>
  );
}
