import { useEffect, useState } from "react";
import {
  ArrowRight,
  Search,
  Bookmark,
  MessageCircle,
  TrendingUp,
  Eye,
  Activity,
} from "lucide-react";
import { SiInstagram } from "@icons-pack/react-simple-icons";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { useUnreadMessages } from "../hooks/useUnreadMessages";
import { motion, AnimatePresence } from "framer-motion";
import PageWrapper from "../components/PageWrapper";
import TradeDetailModal from "../components/TradeDetailModal";
import PostDetailModal from "../components/PostDetailModal";
import {
  fetchUserData,
  fetchUserTrades,
  fetchSavedPosts,
} from "../utils/firebaseHelpers";
import { INTERESTS } from "../utils/constants";
import { getFlagEmoji, toDate } from "../utils/helpers";

interface DashboardStats {
  totalTrades: number;
  savedPosts: number;
  unreadMessages: number;
  recentActivity: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { totalUnread } = useUnreadMessages();
  const navigate = useNavigate();
  const [userData, setUserData] = useState<any>(null);
  const [userTrades, setUserTrades] = useState<any[]>([]);
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalTrades: 0,
    savedPosts: 0,
    unreadMessages: 0,
    recentActivity: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInterest, setSelectedInterest] = useState<string | null>(null);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<any>(null);
  const [selectedPost, setSelectedPost] = useState<any>(null);

  useEffect(() => {
    if (!user) return;

    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const [userDataResult, tradesResult, savedPostsResult] =
          await Promise.all([
            fetchUserData(user.uid),
            fetchUserTrades(user.uid),
            fetchSavedPosts(user.uid),
          ]);

        setUserData(userDataResult);
        setUserTrades(tradesResult);
        setSavedPosts(savedPostsResult);

        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        setStats({
          totalTrades: tradesResult.length,
          savedPosts: savedPostsResult.length,
          unreadMessages: totalUnread,
          recentActivity: tradesResult.filter((trade) => {
            const d = toDate(trade.timestamp);
            return d ? d.getTime() > weekAgo : false;
          }).length,
        });
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  // Update stats when totalUnread changes
  useEffect(() => {
    setStats((prev) => ({
      ...prev,
      unreadMessages: totalUnread,
    }));
  }, [totalUnread]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const handleTradeClick = (trade: any) => {
    setSelectedTrade(trade);
    setShowTradeModal(true);
  };

  const handlePostClick = (post: any) => {
    setSelectedPost(post);
    setShowPostModal(true);
  };

  const filteredInterests = INTERESTS.filter((interest) =>
    interest.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const recentTrades = userTrades.slice(0, 4);
  const recentSaved = savedPosts.slice(0, 4);

  if (loading) {
    return (
      <PageWrapper className="flex h-screen w-full bg-neutral-950 text-white">
        <div className="flex-1 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            {/* Loading skeletons */}
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-neutral-900 rounded-2xl p-6 animate-pulse"
              >
                <div className="h-6 bg-neutral-800 rounded mb-4"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-neutral-800 rounded"></div>
                  <div className="h-4 bg-neutral-800 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper className="min-h-screen w-full bg-neutral-950 text-white">
      <div className="p-4 sm:p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold">
                {getGreeting()},{" "}
                {userData?.displayName || userData?.name || user?.displayName || "User"}
              </h1>
              <p className="text-neutral-400 mt-1 text-sm sm:text-base">
                {userData?.country && (
                  <span className="flex items-center gap-2">
                    <span>{getFlagEmoji(userData.country)}</span>
                    <span>{userData.country}</span>
                  </span>
                )}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8"
        >
          <StatCard
            title="Active Trades"
            value={stats.totalTrades}
            icon={<TrendingUp className="w-5 h-5" />}
            color="text-green-400"
            onClick={() => navigate("/user?tab=trades")}
          />
          <StatCard
            title="Saved Posts"
            value={stats.savedPosts}
            icon={<Bookmark className="w-5 h-5" />}
            color="text-blue-400"
            onClick={() => navigate("/user?tab=saved")}
          />
          <StatCard
            title="Unread Messages"
            value={stats.unreadMessages}
            icon={<MessageCircle className="w-5 h-5" />}
            color="text-purple-400"
            onClick={() => navigate("/messages")}
          />
          <StatCard
            title="Recent Activity"
            value={stats.recentActivity}
            icon={<Activity className="w-5 h-5" />}
            color="text-orange-400"
            onClick={() => navigate("/trade")}
          />
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Search & Interests */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 bg-neutral-900 rounded-xl sm:rounded-2xl p-4 sm:p-6"
          >
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <Search className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              <h2 className="text-xl sm:text-2xl font-bold">
                Discover Interests
              </h2>
            </div>

            <div className="mb-4 sm:mb-6">
              <input
                type="text"
                placeholder="Search interests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-800 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 max-h-80 sm:max-h-96 overflow-y-auto">
              {filteredInterests.map((interest) => (
                <InterestCard
                  key={interest.id}
                  interest={interest}
                  selectedInterest={selectedInterest}
                  onSelect={setSelectedInterest}
                />
              ))}
            </div>
          </motion.div>

          {/* Recent Trades & Saved Posts */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-neutral-900 rounded-xl sm:rounded-2xl p-4 sm:p-6"
          >
            {/* Recent Trades Section */}
            <div className="mb-6 sm:mb-8">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold">Recent Trades</h2>
                <Link
                  to="/user?tab=trades"
                  className="text-primary hover:underline text-sm"
                >
                  View All
                </Link>
              </div>
              <div className="space-y-4">
                {recentTrades.length > 0 ? (
                  recentTrades.map((trade) => (
                    <TradeCard
                      key={trade.id}
                      trade={trade}
                      onClick={() => handleTradeClick(trade)}
                    />
                  ))
                ) : (
                  <div className="text-center py-8 text-neutral-400">
                    <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No trades yet</p>
                    <button
                      onClick={() => navigate("/add")}
                      className="text-primary hover:underline text-sm mt-2"
                    >
                      Add your first trade
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Saved Posts Section */}
            <div>
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold">Saved Posts</h2>
                <Link
                  to="/user?tab=saved"
                  className="text-primary hover:underline text-sm"
                >
                  View All
                </Link>
              </div>
              <div className="space-y-4">
                {recentSaved.length > 0 ? (
                  recentSaved.map((post) => (
                    <SavedPostCard
                      key={post.id}
                      post={post}
                      onClick={() => handlePostClick(post)}
                    />
                  ))
                ) : (
                  <div className="text-center py-8 text-neutral-400">
                    <Bookmark className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No saved posts</p>
                    <p className="text-xs mt-1">
                      Posts you save will appear here
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-3 bg-neutral-900 rounded-xl sm:rounded-2xl p-4 sm:p-6"
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold mb-2">Mangrov</h2>
                <p className="text-neutral-400">
                  Shop through <span className="text-primary">sustainable</span>{" "}
                  products enabling
                  <span className="text-primary"> memorable experiences</span>
                </p>
              </div>
              <div className="flex flex-row items-center gap-3 sm:gap-4">
                <Link
                  to="/about"
                  className="border-2 border-primary rounded-lg bg-transparent tracking-widest text-white px-4 sm:px-8 py-1.5 sm:py-2 text-xs sm:text-sm uppercase font-bold hover:bg-primary transition-all duration-300"
                >
                  About
                </Link>
                <Link to="https://instagram.com/_mangrov_" target="_blank">
                  <SiInstagram className="text-white w-6 h-6 sm:w-8 sm:h-8 hover:text-primary transition-colors" />
                </Link>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-6 text-neutral-400">
              <p className="text-xs text-neutral-500 mt-4">© 2025 Mangrov</p>
              <p className="text-xs text-neutral-500 mt-4">
                <span
                  className="text-sm cursor-pointer hover:text-primary transition-colors"
                  onClick={() => (window.location.href = "/terms-of-service")}
                >
                  Terms of Service
                </span>
              </p>
              <p className="text-xs text-neutral-500 mt-4">
                <span
                  className="text-sm cursor-pointer hover:text-primary transition-colors"
                  onClick={() => (window.location.href = "/privacy-policy")}
                >
                  Privacy Policy
                </span>
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence mode="wait">
        {showTradeModal && selectedTrade && (
          <TradeDetailModal
            trade={selectedTrade}
            isOpen={showTradeModal}
            onClose={() => {
              setShowTradeModal(false);
              setSelectedTrade(null);
            }}
            onTradeUpdate={(updatedTrade) => {
              setUserTrades((prev) =>
                prev.map((trade) =>
                  trade.id === updatedTrade.id
                    ? { ...trade, ...updatedTrade }
                    : trade
                )
              );
              setSelectedTrade(updatedTrade);
            }}
          />
        )}
        {showPostModal && selectedPost && (
          <PostDetailModal
            post={selectedPost}
            onClose={() => {
              setShowPostModal(false);
              setSelectedPost(null);
            }}
            user={user}
            liked={false}
            saved={true}
            handleLike={() => {}}
            handleSave={() => {}}
          />
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}

// Stat Card Component
function StatCard({
  title,
  value,
  icon,
  color,
  onClick,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-neutral-900 rounded-xl p-4 cursor-pointer hover:bg-neutral-800 transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`${color}`}>{icon}</div>
        <ArrowRight className="w-4 h-4 text-neutral-400" />
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-neutral-400">{title}</div>
    </motion.div>
  );
}

// Quick Action Card Component

// Trade Card Component
function TradeCard({ trade, onClick }: { trade: any; onClick?: () => void }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-neutral-800 rounded-lg p-3 cursor-pointer hover:bg-neutral-700 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <img
          src={trade.images?.[0]}
          alt={trade.title}
          className="w-12 h-12 rounded-lg object-cover"
        />
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-white truncate">{trade.title}</h4>
          <p className="text-xs text-neutral-400">
            {(() => {
              const d = toDate(trade.timestamp);
              return d ? d.toLocaleDateString() : "Recently";
            })()}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Eye className="w-4 h-4 text-neutral-400" />
          <span className="text-xs text-neutral-400">0</span>
        </div>
      </div>
    </motion.div>
  );
}

// Interest Card Component
function InterestCard({
  interest,
  selectedInterest,
  onSelect,
}: {
  interest: { id: string; label: string; img: string };
  selectedInterest: string | null;
  onSelect: (id: string) => void;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const navigate = useNavigate();

  const handleInterestClick = () => {
    onSelect(interest.id);
    navigate(`/search?interest=${interest.id}`);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleInterestClick}
      className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer transition-all duration-200 ${
        selectedInterest === interest.id
          ? "ring-2 ring-primary"
          : "hover:ring-2 hover:ring-primary/50"
      }`}
    >
      {/* Loading skeleton */}
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 bg-neutral-800 animate-pulse" />
      )}

      {/* Error fallback */}
      {imageError && (
        <div className="absolute inset-0 bg-neutral-800 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 bg-neutral-700 rounded-full mx-auto mb-2" />
            <p className="text-xs text-neutral-400">{interest.label}</p>
          </div>
        </div>
      )}

      {/* Actual image */}
      <img
        src={interest.img}
        alt={interest.label}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          imageLoaded ? "opacity-100" : "opacity-0"
        }`}
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageError(true)}
        loading="lazy"
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

      {/* Label */}
      <div className="absolute bottom-3 left-3 right-3">
        <p className="text-white text-sm font-semibold">{interest.label}</p>
      </div>
    </motion.div>
  );
}

// Saved Post Card Component
function SavedPostCard({ post, onClick }: { post: any; onClick?: () => void }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-neutral-800 rounded-lg p-3 cursor-pointer hover:bg-neutral-700 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <img
          src={post.images?.[0]}
          alt={post.title}
          className="w-12 h-12 rounded-lg object-cover"
        />
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-white truncate">{post.title}</h4>
          <p className="text-xs text-neutral-400">
            {(() => {
              const d = toDate(post.timestamp);
              return d ? d.toLocaleDateString() : "Recently";
            })()}
          </p>
        </div>
        <Bookmark className="w-4 h-4 text-primary fill-current" />
      </div>
    </motion.div>
  );
}
