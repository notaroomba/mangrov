import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { api } from "../lib/api";
import TradeDetailModal from "../components/TradeDetailModal";

export default function TradeDetail() {
  const { tradeId } = useParams();
  const navigate = useNavigate();
  const [trade, setTrade] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tradeId) return;
    const fetchTrade = async () => {
      try {
        const row = await api.get<any>(`/api/trades/${tradeId}`);
        setTrade({
          ...row,
          uid: row.userId,
          niche: row.niche ? [row.niche] : [],
        });
      } catch (err) {
        console.error("Failed to load trade:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrade();
  }, [tradeId]);

  if (loading) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <TradeDetailModal
        trade={trade}
        isOpen={!!trade}
        onClose={() => navigate(-1)}
      />
    </div>
  );
}
