import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";
import { useAuth } from "./useAuth";

export type UnreadMessage = {
  chatId: string;
  count: number;
  lastMessageTime: Date;
  lastMessage: string;
  otherUserId: string;
  otherUserName: string;
};

type UnreadMessagesContextType = {
  unreadMessages: UnreadMessage[];
  totalUnread: number;
  markAsRead: (chatId: string) => void;
  markAllAsRead: () => void;
  hasUnread: (chatId: string) => boolean;
  getUnreadCount: (chatId: string) => number;
};

const UnreadMessagesContext = createContext<UnreadMessagesContextType | null>(
  null
);

export const UnreadMessagesProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { user } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState<UnreadMessage[]>([]);

  const refreshFromServer = async () => {
    if (!user) {
      setUnreadMessages([]);
      return;
    }
    try {
      const chats = await api.get<any[]>(`/api/chats`);
      const next: UnreadMessage[] = chats
        .filter((c) => (c.unreadCount ?? 0) > 0)
        .map((c) => ({
          chatId: c.id,
          count: c.unreadCount ?? 0,
          lastMessageTime: c.lastMessageAt ? new Date(c.lastMessageAt) : new Date(),
          lastMessage: c.lastMessage ?? "",
          otherUserId: c.partner?.id ?? "",
          otherUserName: c.partner?.name ?? c.partner?.username ?? "Unknown User",
        }));
      setUnreadMessages(next);
    } catch (err) {
      console.error("Failed to fetch unread counts:", err);
    }
  };

  useEffect(() => {
    if (!user) {
      setUnreadMessages([]);
      return;
    }
    refreshFromServer();
    const socket = getSocket();
    const onNew = () => refreshFromServer();
    const onRead = () => refreshFromServer();
    const onBump = () => refreshFromServer();
    socket.on("message:new", onNew);
    socket.on("message:read", onRead);
    socket.on("chat:bump", onBump);
    return () => {
      socket.off("message:new", onNew);
      socket.off("message:read", onRead);
      socket.off("chat:bump", onBump);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const markAsRead = (chatId: string) => {
    setUnreadMessages((prev) => prev.filter((msg) => msg.chatId !== chatId));
  };

  const markAllAsRead = () => {
    setUnreadMessages([]);
  };

  const hasUnread = (chatId: string) => {
    return unreadMessages.some((msg) => msg.chatId === chatId);
  };

  const getUnreadCount = (chatId: string) => {
    const unread = unreadMessages.find((msg) => msg.chatId === chatId);
    return unread ? unread.count : 0;
  };

  const totalUnread = useMemo(
    () => unreadMessages.reduce((sum, msg) => sum + msg.count, 0),
    [unreadMessages]
  );

  return (
    <UnreadMessagesContext.Provider
      value={{
        unreadMessages,
        totalUnread,
        markAsRead,
        markAllAsRead,
        hasUnread,
        getUnreadCount,
      }}
    >
      {children}
    </UnreadMessagesContext.Provider>
  );
};

export const useUnreadMessages = () => {
  const context = useContext(UnreadMessagesContext);
  if (!context) {
    throw new Error(
      "useUnreadMessages must be used within UnreadMessagesProvider"
    );
  }
  return context;
};
