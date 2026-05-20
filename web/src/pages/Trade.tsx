import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";
import { useAuth } from "../hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import PageWrapper from "../components/PageWrapper";
import { INTERESTS } from "../utils/constants";
import { useSwipeable } from "react-swipeable";
import {
  X,
  Heart,
  MessageCircle,
  ArrowRight,
  Filter,
  ChevronUp,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import { useNavigate } from "react-router";

interface Post {
  id: string;
  title: string;
  description: string;
  images: string[];
  niche: string[];
  uid?: string;
}

interface TradeMatch {
  id: string;
  fromUser: string;
  toUser: string;
  fromItem: string | null;
  toItem: string | null;
  fromLiked: boolean;
  toLiked: boolean;
  createdAt: string;
  fromUserName?: string | null;
  toUserName?: string | null;
  fromItemTitle?: string | null;
  toItemTitle?: string | null;
}

export default function Trade() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<null | "left" | "right">(
    null
  );
  const [randomMode, setRandomMode] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [currentTradePost, setCurrentTradePost] = useState<Post | null>(null);
  const [matches, setMatches] = useState<TradeMatch[]>([]);
  const [activeTab, setActiveTab] = useState<"swipe" | "matches">("swipe");
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [, setPassedTrades] = useState<Set<string>>(new Set());
  const [showResetOption, setShowResetOption] = useState(false);

  // Initialize user's interests from the auth context
  useEffect(() => {
    if (!user) return;
    if (user.interests?.length) {
      setUserInterests(user.interests);
      setSelectedNiches(user.interests);
    }
    setLoading(false);
  }, [user]);

  // Fetch user's trades for trading
  useEffect(() => {
    if (!user) return;
    const fetchUserTrades = async () => {
      try {
        const rows = await api.get<any[]>(`/api/trades?userId=me`);
        setUserPosts(
          rows.map((t: any) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            images: t.images ?? [],
            niche: t.niche ? [t.niche] : [],
            uid: t.userId,
          }))
        );
      } catch (err) {
        console.error("Failed to fetch user trades:", err);
      }
    };
    fetchUserTrades();
  }, [user]);

  // Fetch matches - only mutual matches (server-side filter)
  const fetchMatches = useCallback(async () => {
    if (!user) return;
    setMatchesLoading(true);
    try {
      const rows = await api.get<TradeMatch[]>(`/api/matches`);
      setMatches(rows);
    } catch (err) {
      console.error("Failed to fetch matches:", err);
    } finally {
      setMatchesLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  // Subscribe to real-time match notifications
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    const handler = () => fetchMatches();
    socket.on("match:new", handler);
    return () => {
      socket.off("match:new", handler);
    };
  }, [user, fetchMatches]);

  // Memoized fetch posts function
  const fetchPosts = useCallback(async () => {
    if (!user) return;
    setPostsLoading(true);
    try {
      const params = new URLSearchParams({
        excludeOwn: "true",
        excludeSwiped: "true",
        limit: "50",
      });
      // Server filters by a single niche per call; we make multiple requests when filtering by multiple selected niches.
      let rows: any[] = [];
      if (randomMode || selectedNiches.length === 0) {
        rows = await api.get<any[]>(`/api/trades?${params.toString()}`);
      } else {
        const batches = await Promise.all(
          selectedNiches.map((n) =>
            api
              .get<any[]>(`/api/trades?${params.toString()}&niche=${encodeURIComponent(n)}`)
              .catch(() => [])
          )
        );
        const seen = new Set<string>();
        rows = [];
        for (const arr of batches) {
          for (const t of arr) {
            if (!seen.has(t.id)) {
              seen.add(t.id);
              rows.push(t);
            }
          }
        }
      }
      const result: Post[] = rows.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        images: t.images ?? [],
        niche: t.niche ? [t.niche] : [],
        uid: t.userId,
      }));
      setPosts(result);
      setCurrentIndex(0);
      setShowResetOption(false);
    } catch (err) {
      console.error("Failed to fetch posts:", err);
    } finally {
      setPostsLoading(false);
    }
  }, [selectedNiches, randomMode, user]);

  // Memoized filter handlers to prevent rerenders
  const handleRandomModeChange = useCallback((checked: boolean) => {
    setRandomMode(checked);
  }, []);

  const handleNicheChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selected = Array.from(
        e.target.selectedOptions,
        (option) => option.value
      );
      setSelectedNiches(selected);
      setRandomMode(false);
    },
    []
  );

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const swipeLeft = async () => {
    const currentPost = posts[currentIndex];
    if (currentPost && user) {
      try {
        await api.post(`/api/trades/${currentPost.id}/swipe`, {
          decision: "pass",
        });
        setPassedTrades((prev) => new Set([...prev, currentPost.id]));
      } catch (error) {
        console.error("Error recording pass:", error);
      }
    }
    setCurrentIndex((prev) => Math.min(prev + 1, posts.length - 1));
  };
  void swipeLeft;

  const swipeRight = async () => {
    const currentPost = posts[currentIndex];
    if (currentPost && user) {
      try {
        const res = await api.post<{ matched: boolean }>(
          `/api/trades/${currentPost.id}/swipe`,
          { decision: "like" }
        );
        if (res.matched) {
          fetchMatches();
        }
      } catch (error) {
        console.error("Error recording like:", error);
      }
    }
    setCurrentIndex((prev) => Math.min(prev + 1, posts.length - 1));
  };

  // Swipe handlers
  const handleSwipe = (dir: "left" | "right") => {
    if (isAnimating) return;

    if (dir === "left") {
      // Show product picker for pass
      setCurrentTradePost(posts[currentIndex]);
      setShowProductPicker(true);
    } else {
      setSwipeDirection(dir);
      setIsAnimating(true);
      setTimeout(() => {
        swipeRight();
        setIsAnimating(false);
        setSwipeDirection(null);
      }, 350);
    }
  };

  const handleItemSelect = async (_selectedItem: Post) => {
    if (!currentTradePost || !user) return;
    try {
      const res = await api.post<{ matched: boolean }>(
        `/api/trades/${currentTradePost.id}/swipe`,
        { decision: "like" }
      );
      if (res.matched) fetchMatches();
    } catch (error) {
      console.error("Error handling item selection:", error);
    }
    setShowProductPicker(false);
    setCurrentTradePost(null);
    setCurrentIndex((prev) => Math.min(prev + 1, posts.length - 1));
  };

  const handleResetPassedTrades = async () => {
    // Passes are persisted server-side as tradeSwipes; a "reset" is not currently supported.
    // Clear local UI state and refetch.
    setPassedTrades(new Set());
    setShowResetOption(false);
    fetchPosts();
  };

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => handleSwipe("left"),
    onSwipedRight: () => handleSwipe("right"),
    trackMouse: true,
  });

  // Memoized swipe area to prevent rerenders
  const swipeArea = useMemo(
    () => (
      <div className="relative w-full max-w-2xl flex items-center justify-center select-none">
        {/* Card stack */}
        {posts.slice(currentIndex, currentIndex + 2).map((post, idx) => {
          const isTop = idx === 0;
          const offset = idx * 10;
          const scale = 1 - idx * 0.04;
          return (
            <AnimatePresence key={post.id}>
              {isTop ? (
                <motion.div
                  {...swipeHandlers}
                  key={post.id}
                  className=" max-w-lg w-full flex flex-col items-center justify-center cursor-pointer"
                  style={{ zIndex: 2 }}
                  initial={{
                    x: swipeDirection === "left" ? 0 : 0,
                    opacity: 1,
                    scale: 1,
                  }}
                  animate={{
                    x: isAnimating
                      ? swipeDirection === "left"
                        ? -500
                        : 500
                      : 0,
                    opacity: isAnimating ? 0 : 1,
                    scale: 1,
                  }}
                  exit={{
                    x: swipeDirection === "left" ? -500 : 500,
                    opacity: 0,
                    scale: 0.95,
                  }}
                  transition={{ duration: 0.35 }}
                >
                  <div className="relative w-full rounded-3xl shadow-2xl overflow-hidden">
                    <img
                      src={post.images?.[0]}
                      alt={post.title}
                      className="w-full h-auto object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                      <h2 className="text-xl font-bold mb-2">{post.title}</h2>
                      <p className="text-sm text-neutral-200 leading-relaxed">
                        {post.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={post.id}
                  className="absolute w-full flex flex-col items-center justify-center"
                  style={{ zIndex: 1, top: offset, scale, opacity: 0.7 }}
                  initial={{ scale: 0.96, opacity: 0.7 }}
                  animate={{ scale, opacity: 0.7 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="relative w-full rounded-3xl shadow-xl overflow-hidden">
                    <img
                      src={post.images?.[0]}
                      alt={post.title}
                      className="w-full h-auto object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                      <h2 className="text-lg font-bold">{post.title}</h2>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          );
        })}
        {postsLoading ? (
          // Posts Loading Skeleton
          <div className="w-full flex flex-col items-center justify-center text-center px-6 py-16">
            <div className="mb-8 w-full max-w-lg">
              <div className="w-24 h-24 bg-gradient-to-br from-neutral-800 to-neutral-700 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg animate-pulse">
                <Filter size={48} className="text-neutral-400" />
              </div>
              <div className="w-64 h-8 bg-neutral-800 rounded mb-4 animate-pulse mx-auto"></div>
              <div className="w-96 h-4 bg-neutral-800 rounded animate-pulse mx-auto"></div>
            </div>
          </div>
        ) : (
          posts.length === 0 && (
            <div className="w-full flex flex-col items-center justify-center text-center px-6 py-16">
              <div className="mb-8 w-full max-w-lg">
                <div className="w-24 h-24 bg-gradient-to-br from-neutral-800 to-neutral-700 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  {showResetOption ? (
                    <RotateCcw size={48} className="text-neutral-400" />
                  ) : (
                    <Filter size={48} className="text-neutral-400" />
                  )}
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">
                  {showResetOption
                    ? "No More Trades to View"
                    : selectedNiches.length === 0 && !randomMode
                    ? "No Trades Found"
                    : "No Trades Available"}
                </h3>
                <p className="text-lg text-neutral-400 leading-relaxed">
                  {showResetOption ? (
                    <>
                      You've seen all available trades.{" "}
                      <span className="text-primary font-semibold">Reset</span>{" "}
                      to view passed trades again or try different{" "}
                      <span className="text-primary font-semibold">
                        filters
                      </span>
                      .
                    </>
                  ) : selectedNiches.length === 0 && !randomMode ? (
                    <>
                      There are no trades found for your{" "}
                      <span className="text-primary font-semibold">
                        interests
                      </span>
                      . Try enabling{" "}
                      <span className="text-primary font-semibold">
                        Random Mode
                      </span>{" "}
                      or select some interests to discover more trades!
                    </>
                  ) : (
                    <>
                      No trades match your current{" "}
                      <span className="text-primary font-semibold">
                        filters
                      </span>
                      . Try adjusting your{" "}
                      <span className="text-primary font-semibold">
                        preferences
                      </span>{" "}
                      or enabling Random Mode.
                    </>
                  )}
                </p>

                {showResetOption && (
                  <div className="mt-6">
                    <button
                      onClick={handleResetPassedTrades}
                      className="px-6 py-3 bg-gradient-to-r from-primary to-primary/80 text-white rounded-lg hover:from-primary/90 hover:to-primary/70 transition-all duration-200 flex items-center gap-2 mx-auto cursor-pointer shadow-lg"
                    >
                      <RotateCcw size={20} />
                      Reset Passed Trades
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </div>
    ),
    [
      posts,
      currentIndex,
      swipeDirection,
      isAnimating,
      swipeHandlers,
      selectedNiches,
      randomMode,
      showResetOption,
    ]
  );

  const primaryBtn =
    "bg-primary text-primary-foreground hover:bg-primary/80 cursor-pointer transition-all duration-200 active:scale-95 uppercase tracking-widest font-bold disabled:opacity-40 disabled:cursor-not-allowed";
  const mutedInput =
    "rounded-md bg-muted px-3 py-2 text-sm sm:text-base outline-none focus:ring-2 ring-primary/80 transition-all duration-200";

  if (loading) {
    return (
      <PageWrapper className="flex flex-col items-center justify-center min-h-screen space-y-6 bg-neutral-950">
        {/* Tabs Skeleton */}
        <div className="w-full max-w-md flex border-b border-neutral-700">
          <div className="flex-1 py-2">
            <div className="w-16 h-4 bg-neutral-700 rounded mx-auto animate-pulse"></div>
          </div>
          <div className="flex-1 py-2">
            <div className="w-20 h-4 bg-neutral-700 rounded mx-auto animate-pulse"></div>
          </div>
        </div>

        {/* Card Skeleton */}
        <div className="relative w-full max-w-md h-[500px] flex items-center justify-center">
          <div className="w-full h-full bg-neutral-900 rounded-2xl shadow-2xl p-4 flex flex-col items-center text-center border-2 border-neutral-800">
            <div className="w-full h-64 bg-neutral-800 rounded-xl mb-4 animate-pulse"></div>
            <div className="w-3/4 h-8 bg-neutral-800 rounded mb-2 animate-pulse"></div>
            <div className="w-full h-4 bg-neutral-800 rounded animate-pulse"></div>
          </div>
        </div>

        {/* Progress Skeleton */}
        <div className="w-32 h-4 bg-neutral-700 rounded animate-pulse"></div>

        {/* Buttons Skeleton */}
        <div className="flex space-x-8 mt-2 w-full max-w-xs">
          <div className="w-1/2 h-12 bg-neutral-700 rounded-md animate-pulse"></div>
          <div className="w-1/2 h-12 bg-neutral-700 rounded-md animate-pulse"></div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper className="min-h-screen bg-neutral-950">
      {/* Fixed Header */}
      <div className="sticky top-0 z-10 bg-neutral-950/95 backdrop-blur-sm border-b border-neutral-800">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-center">
            <div className="flex border-b border-neutral-700">
              <button
                onClick={() => setActiveTab("swipe")}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition cursor-pointer ${
                  activeTab === "swipe"
                    ? "text-primary border-b-2 border-primary"
                    : "text-neutral-400 hover:text-neutral-300"
                }`}
              >
                <Filter size={16} />
                Discover
              </button>
              <button
                onClick={() => setActiveTab("matches")}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition cursor-pointer ${
                  activeTab === "matches"
                    ? "text-primary border-b-2 border-primary"
                    : "text-neutral-400 hover:text-neutral-300"
                }`}
              >
                <MessageCircle size={16} />
                Matches ({matches.length})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative max-w-6xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {activeTab === "swipe" ? (
            <motion.div
              key="swipe"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center"
            >
              {/* Main Swipe Area - Centered */}
              <div className="flex flex-col items-center justify-center space-y-6 w-full">
                {swipeArea}

                {/* Progress indicator */}
                <div className="text-neutral-400 text-sm mb-2">
                  {posts.length > 0 && (
                    <span>
                      Card {currentIndex + 1} of {posts.length}
                    </span>
                  )}
                </div>

                <div className="flex space-x-8 mt-2 w-full max-w-xs">
                  <button
                    onClick={() => handleSwipe("left")}
                    disabled={isAnimating || currentIndex >= posts.length}
                    className={`w-1/2 rounded-md py-4 ${primaryBtn}`}
                  >
                    <Heart className="w-6 h-6 mx-auto" />
                    Like
                  </button>
                  <button
                    onClick={() => handleSwipe("right")}
                    disabled={isAnimating || currentIndex >= posts.length}
                    className={`w-1/2 rounded-md py-4 ${primaryBtn}`}
                  >
                    <X className="w-6 h-6 mx-auto" />
                    Pass
                  </button>
                </div>

                {/* Filter Toggle Button - Relative to content */}
                <div className="mt-8">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-full shadow-lg transition-all duration-300 cursor-pointer ${
                      showFilters
                        ? "bg-primary text-white"
                        : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                    }`}
                  >
                    <Filter size={20} />
                    Filters
                    {showFilters ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronUp size={16} />
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="matches"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-2xl mx-auto"
            >
              <div className="space-y-4">
                {matchesLoading ? (
                  // Matches Loading Skeleton
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="bg-neutral-900 rounded-xl p-6 border border-neutral-700"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-16 h-4 bg-neutral-700 rounded animate-pulse"></div>
                          <div className="w-8 h-8 bg-neutral-700 rounded animate-pulse"></div>
                        </div>
                        <div className="space-y-2">
                          <div className="w-full h-4 bg-neutral-700 rounded animate-pulse"></div>
                          <div className="w-3/4 h-4 bg-neutral-700 rounded animate-pulse"></div>
                          <div className="w-1/2 h-3 bg-neutral-700 rounded animate-pulse"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : matches.length === 0 ? (
                  <div className="text-center text-neutral-400 py-16">
                    <Heart className="w-16 h-16 mx-auto mb-6 opacity-50" />
                    <h3 className="text-xl font-semibold mb-2">
                      No matches yet
                    </h3>
                    <p className="text-neutral-500">
                      Start swiping to find trades!
                    </p>
                  </div>
                ) : (
                  matches.map((match) => {
                    // Determine which user is the other user (not current user)
                    const isCurrentUserFrom = match.fromUser === user?.uid;
                    const otherUserId = isCurrentUserFrom
                      ? match.toUser
                      : match.fromUser;
                    const otherUserName = isCurrentUserFrom
                      ? match.toUserName
                      : match.fromUserName;
                    const currentUserItemTitle = isCurrentUserFrom
                      ? match.fromItemTitle
                      : match.toItemTitle;
                    const otherUserItemTitle = isCurrentUserFrom
                      ? match.toItemTitle
                      : match.fromItemTitle;

                    return (
                      <motion.div
                        key={match.id}
                        onClick={() => navigate(`/messages/${otherUserId}`)}
                        className="bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-2xl p-6 border border-neutral-700/50 cursor-pointer hover:border-primary/50 hover:from-neutral-800 hover:to-neutral-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
                            <span className="text-sm font-medium text-neutral-300 uppercase tracking-wide">
                              Match
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/messages/${otherUserId}`);
                            }}
                            className="text-primary hover:text-white transition-all duration-200 p-2 rounded-xl hover:bg-primary/20 group"
                          >
                            <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                          </button>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center gap-3 p-4 bg-neutral-800/50 rounded-xl border border-neutral-700/50">
                            <div className="flex-1">
                              <p className="text-white text-sm leading-relaxed">
                                <span
                                  className="text-primary font-semibold cursor-pointer hover:underline transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Find the username for the other user
                                    // const otherUser = matches.find(
                                    //   (match) =>
                                    //     match.fromUser === otherUserId ||
                                    //     match.toUser === otherUserId
                                    // );
                                    const otherUserName =
                                      otherUserId === match.fromUser
                                        ? match.fromUserName
                                        : match.toUserName;
                                    if (otherUserName) {
                                      navigate(`/user/${otherUserName}`);
                                    }
                                  }}
                                >
                                  {otherUserName}
                                </span>{" "}
                                wants to trade{" "}
                                <span className="text-primary font-semibold">
                                  "{otherUserItemTitle}"
                                </span>{" "}
                                for your{" "}
                                <span className="text-primary font-semibold">
                                  "{currentUserItemTitle}"
                                </span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  match.fromLiked && match.toLiked
                                    ? "bg-green-500 animate-pulse"
                                    : "bg-yellow-500"
                                }`}
                              ></div>
                              <p
                                className={`text-xs font-medium ${
                                  match.fromLiked && match.toLiked
                                    ? "text-green-400"
                                    : "text-yellow-400"
                                }`}
                              >
                                {match.fromLiked && match.toLiked
                                  ? "Mutual match!"
                                  : "Pending response"}
                              </p>
                            </div>

                            <div className="text-xs text-neutral-500">
                              {match.createdAt
                                ? new Date(match.createdAt).toLocaleDateString()
                                : "Recently"}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Filters Slide-up Panel - Outside AnimatePresence to prevent re-rendering */}
      <AnimatePresence>
        {showFilters && activeTab === "swipe" && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-10 bg-neutral-900 border-t border-neutral-800 shadow-2xl"
          >
            <div className="max-w-6xl mx-auto px-4 py-6">
              <div className="bg-neutral-800 rounded-xl p-6 border border-neutral-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Filter size={20} />
                    Filters
                  </h3>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="text-neutral-400 hover:text-white transition cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={randomMode}
                        onChange={(e) =>
                          handleRandomModeChange(e.target.checked)
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                    <span className="text-white text-sm">
                      Random Mode (show all)
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Filter by Interests
                    </label>
                    <select
                      className={`w-full ${mutedInput} cursor-pointer`}
                      value={selectedNiches}
                      onChange={handleNicheChange}
                      multiple
                      disabled={randomMode}
                      size={Math.min(userInterests.length, 6) || 2}
                    >
                      {userInterests.map((interest) => (
                        <option key={interest} value={interest}>
                          {INTERESTS.find((i) => i.id === interest)?.label ||
                            interest}
                        </option>
                      ))}
                    </select>
                    {!randomMode && userInterests.length > 1 && (
                      <div className="text-xs text-neutral-400 mt-1">
                        Hold Ctrl (Cmd on Mac) to select multiple interests
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Picker Modal */}
      <AnimatePresence>
        {showProductPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-neutral-900 rounded-xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">
                  Select Your Item to Trade
                </h3>
                <button
                  onClick={() => setShowProductPicker(false)}
                  className="text-neutral-400 hover:text-white cursor-pointer transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-3">
                {userPosts.map((post) => (
                  <motion.div
                    key={post.id}
                    onClick={() => handleItemSelect(post)}
                    className="flex items-center gap-3 p-3 rounded-lg border border-neutral-700 hover:border-primary cursor-pointer transition-all duration-200 hover:bg-neutral-800"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <img
                      src={post.images?.[0]}
                      alt={post.title}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h4 className="text-white font-medium">{post.title}</h4>
                      <p className="text-sm text-neutral-400">
                        {post.description}
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-neutral-400" />
                  </motion.div>
                ))}
              </div>

              {userPosts.length === 0 && (
                <div className="text-center text-neutral-400 py-8">
                  <p>You need to add some trades first!</p>
                  <motion.button
                    onClick={() => navigate("/add")}
                    className={`mt-4 px-6 py-2 rounded-md text-sm bg-primary text-white hover:bg-primary/80 cursor-pointer transition-all duration-200 active:scale-95 uppercase tracking-wide font-bold`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    ADD TRADE
                  </motion.button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}
