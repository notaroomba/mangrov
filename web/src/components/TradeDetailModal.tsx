import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  Edit,
  Trash2,
  X,
  Check,
  ArrowLeftRight,
  Loader2,
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../hooks/useAuth";

interface Trade {
  id: string;
  title: string;
  description: string;
  images: string[];
  niche: string[];
  keywords: string[];
  quantity: number;
  isAvailable: boolean;
  uid: string;
  timestamp: any;
}

interface TradeDetailModalProps {
  trade: Trade | null;
  isOpen: boolean;
  onClose: () => void;
  onTradeUpdate?: (updatedTrade: Trade) => void;
}

export default function TradeDetailModal({
  trade,
  isOpen,
  onClose,
  onTradeUpdate,
}: TradeDetailModalProps) {
  const { user } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({
    title: "",
    description: "",
    quantity: 1,
    isAvailable: true,
  });

  // Prefill edit fields with trade values when entering edit mode or when trade changes
  useEffect(() => {
    if (editing && trade) {
      setEditData({
        title: trade.title || "",
        description: trade.description || "",
        quantity: trade.quantity || 1,
        isAvailable: trade.isAvailable !== false,
      });
    }
  }, [editing, trade]);

  const isOwner = user?.uid === trade?.uid;

  const handleUpdate = async () => {
    if (!trade || !user || user.uid !== trade.uid) return;

    try {
      setSaving(true);
      await api.patch(`/api/trades/${trade.id}`, {
        title: editData.title,
        description: editData.description,
        quantity: editData.quantity,
        isAvailable: editData.isAvailable,
      });
      setEditing(false);
      if (onTradeUpdate) {
        onTradeUpdate({
          ...trade,
          title: editData.title,
          description: editData.description,
          quantity: editData.quantity,
          isAvailable: editData.isAvailable,
        });
      }
      onClose();
    } catch (error) {
      console.error("Error updating trade:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!trade || !user || user.uid !== trade.uid) return;

    if (window.confirm("Are you sure you want to delete this trade?")) {
      try {
        await api.delete(`/api/trades/${trade.id}`);
        onClose();
      } catch (error) {
        console.error("Error deleting trade:", error);
      }
    }
  };

  if (!trade) return null;

  return (
    <AnimatePresence>
      {isOpen && (
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
            className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 rounded-3xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto border border-neutral-700 shadow-2xl"
          >
            {/* Pokemon Card Style Header */}
            <div className="relative mb-6">
              <div className="absolute top-0 right-0 flex gap-2">
                {isOwner && (
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="text-neutral-400 hover:text-white transition cursor-pointer"
                  >
                    <Settings size={20} />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="text-neutral-400 hover:text-white transition cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ArrowLeftRight size={32} className="text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {trade.title}
                </h2>
                <div className="flex justify-center gap-2 mb-4">
                  {trade.niche.map((n) => (
                    <span
                      key={n}
                      className="px-3 py-1 bg-primary/20 text-primary rounded-full text-xs font-bold"
                    >
                      {n}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Trade Image */}
            <div className="relative mb-6">
              <img
                src={trade.images[0]}
                alt={trade.title}
                className="w-full h-48 object-cover rounded-2xl border-2 border-neutral-700"
              />
              {!trade.isAvailable && (
                <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                  UNAVAILABLE
                </div>
              )}
            </div>

            {/* Trade Stats */}
            <div className="space-y-4 mb-6">
              <div className="bg-neutral-800/50 rounded-xl p-4">
                <p className="text-neutral-300 text-sm leading-relaxed">
                  {trade.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-neutral-800/30 rounded-xl p-3 text-center">
                  <div className="text-neutral-400 text-xs mb-1">QUANTITY</div>
                  <div className="text-white font-bold text-lg">
                    {trade.quantity}
                  </div>
                </div>
                <div className="bg-neutral-800/30 rounded-xl p-3 text-center">
                  <div className="text-neutral-400 text-xs mb-1">STATUS</div>
                  <div
                    className={`font-bold text-sm ${
                      trade.isAvailable ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {trade.isAvailable ? "AVAILABLE" : "UNAVAILABLE"}
                  </div>
                </div>
              </div>

              {trade.keywords.length > 0 && (
                <div className="bg-neutral-800/30 rounded-xl p-3">
                  <div className="text-neutral-400 text-xs mb-2">KEYWORDS</div>
                  <div className="flex flex-wrap gap-1">
                    {trade.keywords.map((kw) => (
                      <span
                        key={kw}
                        className="px-2 py-1 bg-neutral-700 text-neutral-300 rounded text-xs"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Settings Panel */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border-t border-neutral-700 pt-4 mt-4"
                >
                  {editing ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs text-neutral-400 mb-1">
                          TITLE
                        </label>
                        <input
                          value={editData.title}
                          onChange={(e) =>
                            setEditData({ ...editData, title: e.target.value })
                          }
                          className="w-full bg-neutral-800 text-white px-3 py-2 rounded-md border border-neutral-700 focus:border-primary outline-none text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-neutral-400 mb-1">
                          DESCRIPTION
                        </label>
                        <textarea
                          value={editData.description}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              description: e.target.value,
                            })
                          }
                          className="w-full bg-neutral-800 text-white px-3 py-2 rounded-md border border-neutral-700 focus:border-primary outline-none text-sm h-20 resize-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-neutral-400 mb-1">
                          QUANTITY
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={editData.quantity}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              quantity: parseInt(e.target.value) || 1,
                            })
                          }
                          className="w-full bg-neutral-800 text-white px-3 py-2 rounded-md border border-neutral-700 focus:border-primary outline-none text-sm"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editData.isAvailable}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                isAvailable: e.target.checked,
                              })
                            }
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                        <span className="text-white text-sm cursor-pointer">
                          Available for trade
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={handleUpdate}
                          disabled={saving}
                          className="flex-1 bg-primary text-white px-3 py-2 rounded-md hover:bg-primary/80 transition text-sm flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {saving ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Check size={14} />
                          )}
                          {saving ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={() => setEditing(false)}
                          disabled={saving}
                          className="flex-1 bg-neutral-700 text-white px-3 py-2 rounded-md hover:bg-neutral-600 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <button
                        onClick={() => setEditing(true)}
                        className="w-full bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/80 transition flex items-center justify-center gap-2 text-sm cursor-pointer"
                      >
                        <Edit size={14} />
                        Edit Trade
                      </button>

                      <button
                        onClick={handleDelete}
                        className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition flex items-center justify-center gap-2 text-sm cursor-pointer"
                      >
                        <Trash2 size={14} />
                        Delete Trade
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
