import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Reply, Send } from "lucide-react";
import dayjs from "dayjs";
import { fetchUserData } from "../utils/firebaseHelpers";

type CommentType = {
  id: string;
  text: string;
  user: string;
  timestamp: any;
  replyToId?: string;
  replyToUserId?: string;
};

type Props = {
  postId: string;
  comment: CommentType;
  onReplyClick: (id: string) => void;
  isReplying: boolean;
  replyText: string;
  onReplyChange: (text: string) => void;
  onReplySubmit: (id: string, userId: string) => void;
  isSubmitting?: boolean;
};

export default function CommentItem({
  comment,
  onReplyClick,
  isReplying,
  replyText,
  onReplyChange,
  onReplySubmit,
  isSubmitting = false,
}: Props) {
  const [userData, setUserData] = useState<{
    avatar?: string;
    name: string;
  } | null>(null);
  const [replyToName, setReplyToName] = useState<string | null>(null);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [formattedTime, setFormattedTime] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setIsLoading(true);
        const data = await fetchUserData(comment.user);
        if (data) {
          setUserData({ avatar: data.avatar, name: data.displayName || data.username || "Unknown" });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, [comment.user]);

  useEffect(() => {
    const fetchReplyToName = async () => {
      if (comment.replyToUserId) {
        try {
          const data = await fetchUserData(comment.replyToUserId);
          if (data) {
            setReplyToName(data.displayName || data.username || null);
          }
        } catch (error) {
          console.error("Error fetching reply user data:", error);
        }
      }
    };
    fetchReplyToName();
  }, [comment.replyToUserId]);

  useEffect(() => {
    if (comment.timestamp) {
      const date =
        typeof comment.timestamp === "string"
          ? new Date(comment.timestamp)
          : typeof comment.timestamp?.toDate === "function"
          ? comment.timestamp.toDate()
          : new Date(comment.timestamp);
      setFormattedTime(dayjs(date).format("HH:mm"));
    }
  }, [comment.timestamp]);

  const handleMouseEnter = () => {
    if (comment.replyToId) {
      const target = document.querySelector(`[data-id='${comment.replyToId}']`);
      if (target) target.classList.add("bg-primary/20");
      setIsHighlighted(true);
    }
  };

  const handleMouseLeave = () => {
    if (comment.replyToId) {
      const target = document.querySelector(`[data-id='${comment.replyToId}']`);
      if (target) target.classList.remove("bg-primary/20");
      setIsHighlighted(false);
    }
  };

  const handleReplyKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onReplySubmit(comment.id, comment.user);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-neutral-700 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-neutral-700 rounded w-24"></div>
            <div className="h-3 bg-neutral-700 rounded w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      data-id={comment.id}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
      className={`group relative rounded-lg p-3 transition-all duration-200 ${
        comment.replyToId
          ? "ml-6 border-l-2 border-primary/30 pl-4 bg-neutral-800/30"
          : "bg-neutral-800/20"
      } ${isHighlighted ? "bg-primary/20" : ""}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {userData?.avatar ? (
            <img
              src={userData.avatar}
              alt={`${userData.name}'s avatar`}
              className="w-8 h-8 rounded-full object-cover border border-white/10"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                target.nextElementSibling?.classList.remove("hidden");
              }}
            />
          ) : null}
          <div
            className={`w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-semibold ${
              userData?.avatar ? "hidden" : ""
            }`}
          >
            {userData?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-primary text-sm">
              {userData?.name || "Unknown User"}
            </span>
            {replyToName && (
              <span className="text-xs text-neutral-400">
                replying to @{replyToName}
              </span>
            )}
            <span className="text-xs text-neutral-500 ml-auto">
              {formattedTime}
            </span>
          </div>

          <div className="text-white/90 text-sm leading-relaxed break-words">
            {comment.text}
          </div>

          <div className="flex items-center mt-2">
            <button
              onClick={() => onReplyClick(comment.id)}
              disabled={isSubmitting}
              className="flex items-center gap-1 text-xs text-neutral-400 hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Reply size={12} />
              Reply
            </button>
          </div>
        </div>
      </div>

      {isReplying && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-3 flex items-center gap-2 bg-neutral-800/50 rounded-lg p-3"
        >
          <input
            value={replyText}
            onChange={(e) => onReplyChange(e.target.value)}
            onKeyPress={handleReplyKeyPress}
            placeholder={`Reply to ${userData?.name || "user"}...`}
            disabled={isSubmitting}
            className="flex-1 bg-transparent text-white placeholder-white/60 text-sm outline-none"
          />
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onReplySubmit(comment.id, comment.user)}
            disabled={!replyText.trim() || isSubmitting}
            className="text-primary hover:text-primary/80 disabled:text-white/40 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={14} />
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
}
