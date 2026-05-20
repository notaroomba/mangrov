import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Heart,
  Bookmark,
  ExternalLink,
  ShoppingCart,
  Send,
} from "lucide-react";
import { api } from "../lib/api";
import type { Post } from "../utils/types";
import CommentItem from "./CommentItem";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { useBusinessProducts } from "../hooks/useBusinessProducts";
import ProductPicker from "./ProductPicker";

const wrapperAnim = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
};

export default function PostDetailModal({
  post,
  onClose,
  liked,
  saved,
  handleLike,
  handleSave,
}: {
  post: Post;
  onClose: () => void;
  user?: any;
  liked: boolean;
  saved: boolean;
  handleLike: () => void;
  handleSave: () => void;
}) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [imgLoaded, setImgLoaded] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pickerRef = useRef<HTMLDivElement | null>(null);
  const commentInputRef = useRef<HTMLInputElement | null>(null);

  const products = useBusinessProducts(post.business);

  const refreshComments = async () => {
    try {
      const rows = await api.get<any[]>(`/api/posts/${post.id}/comments`);
      // Server returns desc; reverse for asc display
      setComments(
        [...rows].reverse().map((c) => ({
          id: c.id,
          text: c.text,
          user: c.userId,
          timestamp: c.createdAt,
        }))
      );
    } catch (err) {
      console.error("Failed to load comments:", err);
    }
  };

  const handleComment = async () => {
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await api.post(`/api/posts/${post.id}/comments`, {
        text: newComment.trim(),
      });
      setNewComment("");
      await refreshComments();
    } catch (error) {
      console.error("Error posting comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = async (_commentId: string, _replyToUserId: string) => {
    if (!replyText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // Replies are stored as plain comments for now (no thread metadata in v1).
      await api.post(`/api/posts/${post.id}/comments`, {
        text: replyText.trim(),
      });
      setReplyText("");
      setReplyingTo(null);
      await refreshComments();
    } catch (error) {
      console.error("Error posting reply:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleComment();
    }
  };

  useEffect(() => {
    refreshComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id]);

  // 🔒 Close picker if clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      ) {
        setShowPicker(false);
      }
    }
    if (showPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showPicker]);

  return (
    <motion.div
      {...wrapperAnim}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4"
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 sm:top-8 sm:right-8 text-white hover:bg-neutral-800/80 p-3 rounded-xl transition-all duration-200 z-50 cursor-pointer backdrop-blur-sm"
      >
        <X size={18} className="sm:w-5 sm:h-5" />
      </button>

      <motion.div
        key="modal"
        {...wrapperAnim}
        transition={{ duration: 0.3 }}
        className="bg-neutral-900 text-white w-full max-w-5xl h-[95vh] sm:h-[90vh] rounded-xl overflow-hidden flex flex-col lg:flex-row max-h-screen"
      >
        {/* LEFT - Image Section */}
        <div className="w-full lg:w-2/3 bg-black flex items-center justify-center relative h-1/2 lg:h-full overflow-hidden">
          {!imgLoaded && (
            <div className="absolute inset-0 bg-neutral-800 animate-pulse" />
          )}
          <Slider
            dots
            infinite
            speed={400}
            slidesToShow={1}
            slidesToScroll={1}
            arrows={false}
            className="w-full h-full"
            appendDots={(dots) => (
              <div style={{ bottom: "10px" }}>
                <ul className="flex justify-center gap-2">{dots}</ul>
              </div>
            )}
            customPaging={() => (
              <div className="w-2 h-2 bg-white/50 rounded-full" />
            )}
          >
            {post.images.map((img, index) => (
              <div
                key={index}
                className="flex justify-center items-center h-full w-full"
              >
                <img
                  src={img}
                  alt={`Image ${index + 1}`}
                  onLoad={() => setImgLoaded(true)}
                  className={`h-full w-full object-cover transition-opacity duration-500 ${
                    imgLoaded ? "opacity-100" : "opacity-0"
                  }`}
                />
              </div>
            ))}
          </Slider>
        </div>

        {/* RIGHT - Content Section */}
        <div className="w-full lg:w-1/3 border-t lg:border-l border-neutral-800 flex flex-col justify-between h-1/2 lg:h-full">
          <div className="p-3 sm:p-4 border-b border-neutral-800">
            <h2 className="text-base sm:text-lg font-semibold line-clamp-2">
              {post.title}
            </h2>
            <p className="text-xs sm:text-sm text-primary/80 mt-1">
              {post.niche}
            </p>
            {post.description && (
              <p className="text-xs sm:text-sm text-white/80 mt-1 line-clamp-3">
                {post.description}
              </p>
            )}
            <p className="text-xs text-neutral-400 mt-2">
              {post.timestamp
                ? new Date(
                    typeof (post.timestamp as any)?.toDate === "function"
                      ? (post.timestamp as any).toDate()
                      : post.timestamp
                  ).toLocaleString()
                : ""}
            </p>
          </div>

          {/* Comments Section */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 min-h-0">
            <div className="space-y-2 sm:space-y-3">
              {comments.length === 0 ? (
                <div className="text-center py-4 sm:py-8">
                  <p className="text-xs sm:text-sm text-white/60">
                    No comments yet.
                  </p>
                  <p className="text-xs text-white/40 mt-1">
                    Be the first to comment!
                  </p>
                </div>
              ) : (
                comments.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    postId={post.id}
                    comment={comment}
                    onReplyClick={(id) =>
                      setReplyingTo(replyingTo === id ? null : id)
                    }
                    isReplying={replyingTo === comment.id}
                    replyText={replyText}
                    onReplyChange={setReplyText}
                    onReplySubmit={handleReply}
                    isSubmitting={isSubmitting}
                  />
                ))
              )}
            </div>
          </div>

          {/* Action Bar */}
          <div className="border-t border-neutral-800 p-3 sm:p-4 space-y-3 sm:space-y-4">
            {/* Like, Save, and Other Actions */}
            <div className="flex items-center gap-4 sm:gap-6">
              {post.likes !== false && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleLike}
                  className="cursor-pointer hover:scale-105 transition-transform p-2"
                >
                  {liked ? (
                    <Heart
                      size={20}
                      className="sm:w-6 sm:h-6 text-red-500"
                      fill="currentColor"
                    />
                  ) : (
                    <Heart
                      size={20}
                      className="sm:w-6 sm:h-6 text-white hover:text-red-400"
                    />
                  )}
                </motion.button>
              )}
              {post.saves !== false && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleSave}
                  className="cursor-pointer hover:scale-105 transition-transform p-2"
                >
                  {saved ? (
                    <Bookmark
                      size={20}
                      className="sm:w-6 sm:h-6 text-primary"
                      fill="currentColor"
                    />
                  ) : (
                    <Bookmark
                      size={20}
                      className="sm:w-6 sm:h-6 text-white hover:text-primary"
                    />
                  )}
                </motion.button>
              )}

              <div className="ml-auto flex items-center gap-2 sm:gap-3">
                <div className="relative" ref={pickerRef}>
                  <button
                    onClick={() => setShowPicker(!showPicker)}
                    className="cursor-pointer hover:scale-105 transition-transform p-2"
                  >
                    <ShoppingCart
                      size={20}
                      className="sm:w-6 sm:h-6 text-white hover:text-primary"
                    />
                  </button>

                  <AnimatePresence>
                    {showPicker && (
                      <ProductPicker
                        products={products.filter((p) =>
                          post.productIds.includes(p.id)
                        )}
                      />
                    )}
                  </AnimatePresence>
                </div>

                {post.business && (
                  <a
                    href={`/business/${post.business}`}
                    target="_blank"
                    className="cursor-pointer hover:scale-105 transition-transform p-2"
                  >
                    <ExternalLink
                      size={20}
                      className="sm:w-6 sm:h-6 text-white hover:text-primary"
                    />
                  </a>
                )}
              </div>
            </div>

            {/* Comment Input */}
            {post.comments !== false && (
              <div className="flex items-center gap-2 sm:gap-3 bg-neutral-800/50 rounded-lg p-2 sm:p-3">
                <input
                  ref={commentInputRef}
                  className="flex-1 bg-transparent text-white placeholder-white/60 text-xs sm:text-sm outline-none"
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isSubmitting}
                />
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleComment}
                  disabled={!newComment.trim() || isSubmitting}
                  className="text-primary hover:text-primary/80 disabled:text-white/40 disabled:cursor-not-allowed transition-colors p-1"
                >
                  <Send size={16} className="sm:w-5 sm:h-5" />
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
