import { useEffect, useState, useCallback } from "react";
import { SearchIcon, Filter, X } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { useSearchParams } from "react-router";
import PageWrapper from "../components/PageWrapper";
import { motion, AnimatePresence } from "framer-motion";
import InfiniteScroll from "react-infinite-scroll-component";
import type { Post } from "../utils/types";
import PostCard from "../components/PostCard";
import { INTERESTS } from "../utils/constants";

export default function Search() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [displayedPosts, setDisplayedPosts] = useState<Post[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [selectedInterest, setSelectedInterest] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [sortBy, setSortBy] = useState<
    "recent" | "price-low" | "price-high" | "popular"
  >("recent");
  const [filterSearchTerm, setFilterSearchTerm] = useState("");
  const BATCH_SIZE = 20;

  const [loadedImages, setLoadedImages] = useState<number[]>([]);

  useEffect(() => {
    document.body.style.overflow = "auto";
  }, []);

  // Handle interest filter from URL
  useEffect(() => {
    const interestParam = searchParams.get("interest");
    if (interestParam) {
      setSelectedInterest(interestParam);
      setShowFilters(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim().toLowerCase());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const mapPost = (row: any): Post => ({
    id: row.id,
    title: row.title,
    description: row.description,
    images: row.images ?? [],
    keywords: row.keywords ?? [],
    niche: row.niche ?? [],
    likes: true,
    saves: true,
    business: "",
    comments: false,
    timestamp: row.createdAt,
    url: row.url ?? "",
    productIds: [],
    uid: row.userId,
    isAvailable: row.isAvailable,
    price: row.price != null ? Number(row.price) : undefined,
    views: 0,
  });

  const fetchInitialPosts = async () => {
    const rows = await api.get<any[]>(`/api/posts?limit=${BATCH_SIZE}`);
    const posts = rows.map(mapPost);
    setAllPosts(posts);
    setFilteredPosts(posts);
    setDisplayedPosts(posts);
    setCursor(rows.length ? rows[rows.length - 1].createdAt : null);
    setHasMore(rows.length === BATCH_SIZE);
  };

  const loadMorePosts = async () => {
    if (!hasMore || !cursor) return;
    const rows = await api.get<any[]>(
      `/api/posts?limit=${BATCH_SIZE}&cursor=${encodeURIComponent(cursor)}`
    );
    if (rows.length === 0) {
      setHasMore(false);
      return;
    }
    const newPosts = rows.map(mapPost);
    setAllPosts((prev) => [...prev, ...newPosts]);
    setCursor(rows[rows.length - 1].createdAt);
    if (rows.length < BATCH_SIZE) setHasMore(false);
  };

  const loadMoreFilteredPosts = () => {
    const currentLength = displayedPosts.length;
    const nextSlice = filteredPosts.slice(
      currentLength,
      currentLength + BATCH_SIZE
    );
    setDisplayedPosts((prev) => [...prev, ...nextSlice]);
  };

  const fetchSavedPosts = useCallback(async () => {
    if (!user) return;
    try {
      const rows = await api.get<any[]>(`/api/users/me/saves`);
      setSavedPosts(rows.map(mapPost));
    } catch (err) {
      console.error("fetchSavedPosts failed", err);
      setSavedPosts([]);
    }
  }, [user]);

  useEffect(() => {
    fetchInitialPosts();
    fetchSavedPosts();
  }, [fetchSavedPosts]);

  // Filter posts based on search term, interest, and price range
  useEffect(() => {
    let filtered = allPosts;

    // Filter by search term
    if (debouncedSearchTerm) {
      filtered = filtered.filter(
        (post) =>
          post.title?.toLowerCase().includes(debouncedSearchTerm) ||
          post.description?.toLowerCase().includes(debouncedSearchTerm) ||
          (post.niche?.[0]?.toLowerCase() || "").includes(debouncedSearchTerm)
      );
    }

    // Filter by interest
    if (selectedInterest) {
      filtered = filtered.filter(
        (post) =>
          (post.niche?.[0]?.toLowerCase() || "") ===
          selectedInterest.toLowerCase()
      );
    }

    // Filter by price range
    filtered = filtered.filter((post) => {
      const price = post.price || 0;
      return price >= priceRange[0] && price <= priceRange[1];
    });

    // Sort posts
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "price-low":
          return (a.price || 0) - (b.price || 0);
        case "price-high":
          return (b.price || 0) - (a.price || 0);
        case "popular":
          return (b.views || 0) - (a.views || 0);
        case "recent":
        default:
          return (
            new Date(b.timestamp || 0).getTime() -
            new Date(a.timestamp || 0).getTime()
          );
      }
    });

    setFilteredPosts(filtered);
    setDisplayedPosts(filtered.slice(0, BATCH_SIZE));
  }, [allPosts, debouncedSearchTerm, selectedInterest, priceRange, sortBy]);

  const handleImageLoad = (index: number) => {
    setLoadedImages((prev) => [...prev, index]);
  };

  const handleLoadMore = () => {
    if (filteredPosts.length > displayedPosts.length) {
      loadMoreFilteredPosts();
    } else {
      loadMorePosts();
    }
  };

  const clearFilters = () => {
    setSelectedInterest(null);
    setPriceRange([0, 1000]);
    setSortBy("recent");
    setSearchTerm("");
    setFilterSearchTerm("");
    setSearchParams({});
  };



  return (
    <PageWrapper className="min-h-screen bg-neutral-950 text-white overflow-scroll">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Discover Products</h1>

          {/* Search and Filter Bar */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            {/* Search Input */}
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Filter Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 hover:bg-neutral-800 transition-colors"
            >
              <Filter className="w-5 h-5" />
              Filters
            </button>
          </div>

          {/* Active Filters */}
          {(selectedInterest ||
            priceRange[0] > 0 ||
            priceRange[1] < 1000 ||
            sortBy !== "recent") && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-neutral-400">Active filters:</span>
              {selectedInterest && (
                <span className="bg-primary/20 text-primary px-2 py-1 rounded text-sm">
                  {INTERESTS.find((i) => i.id === selectedInterest)?.label ||
                    selectedInterest}
                </span>
              )}
              {(priceRange[0] > 0 || priceRange[1] < 1000) && (
                <span className="bg-primary/20 text-primary px-2 py-1 rounded text-sm">
                  ${priceRange[0]} - ${priceRange[1]}
                </span>
              )}
              {sortBy !== "recent" && (
                <span className="bg-primary/20 text-primary px-2 py-1 rounded text-sm capitalize">
                  {sortBy.replace("-", " ")}
                </span>
              )}
              <button
                onClick={clearFilters}
                className="text-neutral-400 hover:text-white text-sm flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-neutral-900 rounded-lg p-6 mb-6 overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Interest Filter */}
                <div>
                  <h3 className="font-semibold mb-3">Category</h3>
                  <div className="mb-3">
                    <input
                      type="text"
                      placeholder="Search categories..."
                      value={filterSearchTerm}
                      onChange={(e) => setFilterSearchTerm(e.target.value)}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {INTERESTS.filter((interest) =>
                      interest.label
                        .toLowerCase()
                        .includes(filterSearchTerm.toLowerCase())
                    ).map((interest) => (
                      <button
                        key={interest.id}
                        onClick={() =>
                          setSelectedInterest(
                            selectedInterest === interest.id
                              ? null
                              : interest.id
                          )
                        }
                        className={`p-2 rounded text-sm transition-colors ${
                          selectedInterest === interest.id
                            ? "bg-primary text-white"
                            : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                        }`}
                      >
                        {interest.label}
                      </button>
                    ))}
                  </div>
                  {INTERESTS.filter((interest) =>
                    interest.label
                      .toLowerCase()
                      .includes(filterSearchTerm.toLowerCase())
                  ).length > 0 && (
                    <p className="text-xs text-neutral-400 mt-2">
                      {
                        INTERESTS.filter((interest) =>
                          interest.label
                            .toLowerCase()
                            .includes(filterSearchTerm.toLowerCase())
                        ).length
                      }{" "}
                      categories available
                    </p>
                  )}
                  {filterSearchTerm &&
                    INTERESTS.filter((interest) =>
                      interest.label
                        .toLowerCase()
                        .includes(filterSearchTerm.toLowerCase())
                    ).length === 0 && (
                      <p className="text-xs text-neutral-400 mt-2">
                        No categories found matching "{filterSearchTerm}"
                      </p>
                    )}
                </div>

                {/* Price Range */}
                <div>
                  <h3 className="font-semibold mb-3">Price Range</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="block text-xs text-neutral-400 mb-1">
                          Min
                        </label>
                        <input
                          type="number"
                          placeholder="0"
                          value={priceRange[0]}
                          onChange={(e) =>
                            setPriceRange([
                              Number(e.target.value),
                              priceRange[1],
                            ])
                          }
                          className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                      <div className="flex items-center justify-center pt-6">
                        <span className="text-neutral-400 text-sm font-medium">
                          to
                        </span>
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-neutral-400 mb-1">
                          Max
                        </label>
                        <input
                          type="number"
                          placeholder="1000"
                          value={priceRange[1]}
                          onChange={(e) =>
                            setPriceRange([
                              priceRange[0],
                              Number(e.target.value),
                            ])
                          }
                          className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sort Options */}
                <div>
                  <h3 className="font-semibold mb-3">Sort By</h3>
                  <div className="space-y-2">
                    {[
                      { value: "recent", label: "Most Recent" },
                      { value: "price-low", label: "Price: Low to High" },
                      { value: "price-high", label: "Price: High to Low" },
                      { value: "popular", label: "Most Popular" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setSortBy(option.value as any)}
                        className={`w-full text-left p-2 rounded text-sm transition-colors ${
                          sortBy === option.value
                            ? "bg-primary text-white"
                            : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-neutral-400">
            {filteredPosts.length} product
            {filteredPosts.length !== 1 ? "s" : ""} found
          </p>
        </div>

        {/* Pinterest-style Grid */}
        <InfiniteScroll
          dataLength={displayedPosts.length}
          next={handleLoadMore}
          hasMore={hasMore || displayedPosts.length < filteredPosts.length}
          loader={
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          }
          className="overflow-hidden"
        >
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
            {displayedPosts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="break-inside-avoid mb-4"
              >
                <PostCard
                  post={post}
                  index={index}
                  isLoaded={loadedImages.includes(index)}
                  onImageLoad={() => handleImageLoad(index)}
                  userSavedPosts={savedPosts.map((p) => p.id)}
                />
              </motion.div>
            ))}
          </div>
        </InfiniteScroll>

        {/* Empty State */}
        {filteredPosts.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <SearchIcon className="w-8 h-8 text-neutral-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No products found</h3>
            <p className="text-neutral-400 mb-4">
              Try adjusting your search terms or filters
            </p>
            <button
              onClick={clearFilters}
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/80 transition-colors"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
