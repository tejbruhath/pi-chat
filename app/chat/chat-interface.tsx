"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Search,
  LogOut,
  MessageSquarePlus,
  Users,
  Paperclip,
  Send,
  X,
  UserPlus,
} from "lucide-react";
import { useSocket } from "@/lib/useSocket";

interface Message {
  id: string;
  content: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
  senderId: string;
  senderName?: string | null;
  senderAvatar?: string | null;
  sentAt: number;
}

interface Conversation {
  id: string;
  name: string;
  isGroup: boolean;
  participants: any[];
  lastMessage?: any;
}

interface SearchUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export default function ChatInterface() {
  const { user, logout, updateUser } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);
  const [messageInput, setMessageInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [newChatDialogOpen, setNewChatDialogOpen] = useState(false);
  const [groupChatDialogOpen, setGroupChatDialogOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [retryingMessages, setRetryingMessages] = useState<Set<string>>(
    new Set()
  );
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [nestedUserModalOpen, setNestedUserModalOpen] = useState(false);
  const [selectedUserForDetails, setSelectedUserForDetails] =
    useState<any>(null);
  const [editingName, setEditingName] = useState(user?.name || "");
  const [editingAvatar, setEditingAvatar] = useState(user?.avatar || "");
  const [readMessages, setReadMessages] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const socket = useSocket(user?.id);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    fetchConversations();
  }, [user, router]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation);
      socket.joinConversation(selectedConversation);
      // Mark conversation as read
      setReadMessages((prev) => new Set(prev).add(selectedConversation));
    }

    return () => {
      if (selectedConversation) {
        socket.leaveConversation(selectedConversation);
      }
    };
  }, [selectedConversation]);

  useEffect(() => {
    const handleNewMessage = (message: Message) => {
      if (message) {
        // Check if message already exists to prevent duplicates
        setMessages((prev) => {
          const exists = prev.some((msg) => msg.id === message.id);
          if (exists) return prev;
          return [...prev, message];
        });
        scrollToBottom();
      }
    };

    socket.onNewMessage(handleNewMessage);

    return () => {
      socket.offNewMessage(handleNewMessage);
    };
  }, [socket]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const checkAuthStatus = async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (!response.ok) {
        console.warn("Auth check failed:", response.status);
        return false;
      }
      return true;
    } catch (error) {
      console.error("Auth check error:", error);
      return false;
    }
  };

  const retryFailedMessage = async (messageId: string, content: string) => {
    if (!selectedConversation || retryingMessages.has(messageId)) return;

    // Check auth status before retrying
    const isAuthenticated = await checkAuthStatus();
    if (!isAuthenticated) {
      console.warn("Not authenticated, cannot retry message");
      return;
    }

    setRetryingMessages((prev) => new Set(prev).add(messageId));

    try {
      const response = await fetch(
        `/api/conversations/${selectedConversation}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Replace the failed message with the successful one
        setMessages((prev) =>
          prev.map((msg) => (msg.id === messageId ? data.message : msg))
        );
        if (socket.isConnected) {
          socket.sendMessage(selectedConversation, data.message);
        }
      } else {
        console.warn("Retry failed with status:", response.status);
      }
    } catch (error) {
      console.error("Retry failed:", error);
    } finally {
      setRetryingMessages((prev) => {
        const newSet = new Set(prev);
        newSet.delete(messageId);
        return newSet;
      });
    }
  };

  const fetchConversations = async () => {
    try {
      const response = await fetch("/api/conversations");
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await fetch(
        `/api/conversations/${conversationId}/messages`
      );
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(
        `/api/users/search?q=${encodeURIComponent(query)}`
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users);
      }
    } catch (error) {
      console.error("Failed to search users:", error);
    }
  };

  const createDirectConversation = async (userId: string) => {
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantIds: [userId],
          isGroup: false,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setNewChatDialogOpen(false);
        setUserSearchQuery("");
        setSearchResults([]);
        await fetchConversations();
        setSelectedConversation(data.conversation.id);
      }
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };

  const createGroupChat = async () => {
    if (!groupName || selectedUsers.length === 0) return;

    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantIds: selectedUsers,
          isGroup: true,
          name: groupName,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGroupChatDialogOpen(false);
        setGroupName("");
        setSelectedUsers([]);
        setSearchResults([]);
        await fetchConversations();
        setSelectedConversation(data.conversation.id);
      }
    } catch (error) {
      console.error("Failed to create group chat:", error);
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation) return;

    const content = messageInput.trim();
    setMessageInput("");

    // Check auth status before sending
    const isAuthenticated = await checkAuthStatus();
    if (!isAuthenticated) {
      console.warn("Not authenticated, cannot send message");
      return;
    }

    // Optimistically add the message to the UI immediately
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      content,
      senderId: user!.id,
      senderName: user!.name,
      senderAvatar: user!.avatar,
      sentAt: Math.floor(Date.now() / 1000),
    };

    setMessages((prev) => [...prev, tempMessage]);
    scrollToBottom();

    try {
      const response = await fetch(
        `/api/conversations/${selectedConversation}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Replace the temporary message with the real one from the server
        setMessages((prev) =>
          prev.map((msg) => (msg.id === tempMessage.id ? data.message : msg))
        );
        // Only send via socket if connected
        if (socket.isConnected) {
          socket.sendMessage(selectedConversation, data.message);
        }
      } else if (response.status === 401 || response.status === 403) {
        // Authentication error - keep the message but mark it as failed
        console.warn("Authentication error when sending message", {
          status: response.status,
          conversationId: selectedConversation,
          userId: user?.id,
        });
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempMessage.id ? { ...msg, id: `failed-${msg.id}` } : msg
          )
        );
        // Don't reload the page, just keep the message visible
        console.log(
          "Message failed to send due to auth error, but kept visible"
        );
      } else {
        // Other error - remove the temporary message
        setMessages((prev) => prev.filter((msg) => msg.id !== tempMessage.id));
        setMessageInput(content);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      // Keep the message but mark it as failed
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempMessage.id ? { ...msg, id: `failed-${msg.id}` } : msg
        )
      );
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !selectedConversation) return;

    setUploadingFile(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (uploadResponse.ok) {
        const uploadData = await uploadResponse.json();

        const response = await fetch(
          `/api/conversations/${selectedConversation}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: `Shared ${file.name}`,
              mediaUrl: uploadData.url,
              mediaType: uploadData.type,
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          socket.sendMessage(selectedConversation, data.message);
        }
      }
    } catch (error) {
      console.error("Failed to upload file:", error);
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const updateProfile = async () => {
    try {
      const response = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingName,
          avatar: editingAvatar,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update user context
        updateUser(data.user);
        setProfileEditOpen(false);
      }
    } catch (error) {
      console.error("Failed to update profile:", error);
    }
  };

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (uploadResponse.ok) {
        const uploadData = await uploadResponse.json();
        setEditingAvatar(uploadData.url);
      }
    } catch (error) {
      console.error("Failed to upload avatar:", error);
    }
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedConv = conversations.find((c) => c.id === selectedConversation);

  if (!user) return null;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-200 flex flex-col bg-white">
        {/* User profile */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div
            className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
            onClick={() => setProfileEditOpen(true)}
          >
            <Avatar className="border-2 border-black">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-xs text-gray-500">
                {socket.isConnected ? "Online" : "Connecting..."}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search conversations"
              className="pl-10 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* New chat buttons */}
        <div className="p-2 border-b border-gray-200 flex gap-2">
          <Dialog open={newChatDialogOpen} onOpenChange={setNewChatDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="flex-1 justify-start gap-2"
                variant="outline"
                size="sm"
              >
                <MessageSquarePlus className="h-4 w-4" />
                New Chat
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start New Chat</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search users..."
                    className="pl-10"
                    value={userSearchQuery}
                    onChange={(e) => {
                      setUserSearchQuery(e.target.value);
                      searchUsers(e.target.value);
                    }}
                  />
                </div>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                        onClick={() => createDirectConversation(user.id)}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar>
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback>
                              {user.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{user.name}</p>
                            <p className="text-xs text-gray-500">
                              {user.email}
                            </p>
                          </div>
                        </div>
                        <MessageSquarePlus className="h-4 w-4 text-gray-400" />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog
            open={groupChatDialogOpen}
            onOpenChange={setGroupChatDialogOpen}
          >
            <DialogTrigger asChild>
              <Button
                className="flex-1 justify-start gap-2"
                variant="outline"
                size="sm"
              >
                <Users className="h-4 w-4" />
                New Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Group Chat</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Group name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search users to add..."
                    className="pl-10"
                    value={userSearchQuery}
                    onChange={(e) => {
                      setUserSearchQuery(e.target.value);
                      searchUsers(e.target.value);
                    }}
                  />
                </div>
                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map((userId) => {
                      const user = searchResults.find((u) => u.id === userId);
                      return user ? (
                        <div
                          key={userId}
                          className="flex items-center gap-1 bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-sm"
                        >
                          {user.name}
                          <button
                            onClick={() =>
                              setSelectedUsers((prev) =>
                                prev.filter((id) => id !== userId)
                              )
                            }
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : null;
                    })}
                  </div>
                )}
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {searchResults
                      .filter((u) => !selectedUsers.includes(u.id))
                      .map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                          onClick={() =>
                            setSelectedUsers((prev) => [...prev, user.id])
                          }
                        >
                          <div className="flex items-center gap-2">
                            <Avatar>
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback>
                                {user.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{user.name}</p>
                              <p className="text-xs text-gray-500">
                                {user.email}
                              </p>
                            </div>
                          </div>
                          <UserPlus className="h-4 w-4 text-gray-400" />
                        </div>
                      ))}
                  </div>
                </ScrollArea>
                <Button
                  onClick={createGroupChat}
                  disabled={!groupName || selectedUsers.length === 0}
                  className="w-full"
                >
                  Create Group
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Profile Edit Modal */}
          <Dialog open={profileEditOpen} onOpenChange={setProfileEditOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Profile</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    <Avatar className="h-20 w-20 border-2 border-black">
                      <AvatarImage src={editingAvatar} alt={editingName} />
                      <AvatarFallback>{editingName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <Button
                      size="sm"
                      className="absolute -bottom-2 -right-2 rounded-full"
                      onClick={() => avatarInputRef.current?.click()}
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                    <input
                      type="file"
                      ref={avatarInputRef}
                      onChange={handleAvatarUpload}
                      className="hidden"
                      accept="image/*"
                    />
                  </div>
                  <Input
                    placeholder="Name"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="text-center"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={updateProfile}
                    className="flex-1"
                    disabled={!editingName.trim()}
                  >
                    Save Changes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setProfileEditOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Conversations list */}
        <ScrollArea className="flex-1">
          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading...</div>
            ) : filteredConversations.length > 0 ? (
              filteredConversations.map((conversation) => {
                const hasNewMessages =
                  conversation.lastMessage &&
                  conversation.lastMessage.senderId !== user.id &&
                  conversation.lastMessage.sentAt > Date.now() / 1000 - 3600 && // New within last hour
                  !readMessages.has(conversation.id); // Not read yet

                return (
                  <div
                    key={conversation.id}
                    className={`p-3 hover:bg-gray-50 cursor-pointer flex items-start ${
                      selectedConversation === conversation.id
                        ? "bg-blue-50"
                        : ""
                    }`}
                    onClick={() => setSelectedConversation(conversation.id)}
                  >
                    <div className="relative">
                      <Avatar className="border-2 border-black">
                        <AvatarFallback>
                          {conversation.isGroup ? (
                            <Users className="h-5 w-5" />
                          ) : (
                            conversation.name.charAt(0)
                          )}
                        </AvatarFallback>
                      </Avatar>
                      {hasNewMessages && (
                        <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <p className="font-medium truncate text-gray-900">
                          {conversation.name}
                        </p>
                        {conversation.lastMessage && (
                          <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                            {new Date(
                              conversation.lastMessage.sentAt * 1000
                            ).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                      {conversation.lastMessage && (
                        <p className="text-sm text-gray-600 truncate mt-1">
                          {conversation.lastMessage.senderName}:{" "}
                          {conversation.lastMessage.content}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center text-gray-500">
                {searchQuery
                  ? "No matching conversations"
                  : "No conversations yet"}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation && selectedConv ? (
          <>
            {/* Chat header */}
            <div className="h-16 border-b border-gray-200 flex items-center px-4 justify-between bg-white">
              <div
                className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                onClick={() => setUserDetailsOpen(true)}
              >
                <Avatar className="border-2 border-black">
                  <AvatarFallback>
                    {selectedConv.isGroup ? (
                      <Users className="h-5 w-5" />
                    ) : (
                      selectedConv.name.charAt(0)
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="ml-3">
                  <p className="font-medium">{selectedConv.name}</p>
                  <p className="text-xs text-gray-500">
                    {selectedConv.isGroup
                      ? `${selectedConv.participants.length} members`
                      : "Active now"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMediaModalOpen(true)}
                  className="text-sm"
                >
                  Browse Media in this chat
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4 bg-gray-50">
              <div className="max-w-3xl mx-auto space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.senderId === user.id
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md ${
                        message.senderId === user.id
                          ? "bg-indigo-600 text-white"
                          : "bg-white text-gray-900"
                      } rounded-lg p-3 shadow`}
                    >
                      {message.senderId !== user.id && selectedConv.isGroup && (
                        <p className="text-xs font-semibold mb-1 opacity-75">
                          {message.senderName}
                        </p>
                      )}
                      {message.mediaUrl && (
                        <div className="mb-2">
                          {message.mediaType?.startsWith("image/") ? (
                            <img
                              src={message.mediaUrl}
                              alt="Shared media"
                              className="rounded max-w-full"
                            />
                          ) : message.mediaType?.startsWith("video/") ? (
                            <video
                              src={message.mediaUrl}
                              controls
                              className="rounded max-w-full"
                            />
                          ) : (
                            <a
                              href={message.mediaUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline"
                            >
                              View attachment
                            </a>
                          )}
                        </div>
                      )}
                      <p className="text-sm">{message.content}</p>
                      {message.id.startsWith("failed-") &&
                        message.senderId === user.id && (
                          <div className="mt-2 flex justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                retryFailedMessage(message.id, message.content)
                              }
                              disabled={retryingMessages.has(message.id)}
                              className="text-xs"
                            >
                              {retryingMessages.has(message.id)
                                ? "Retrying..."
                                : "Retry"}
                            </Button>
                          </div>
                        )}
                      <p
                        className={`text-xs mt-1 text-right ${
                          message.senderId === user.id
                            ? "text-indigo-200"
                            : "text-gray-500"
                        }`}
                      >
                        {new Date(message.sentAt * 1000).toLocaleTimeString(
                          [],
                          { hour: "2-digit", minute: "2-digit" }
                        )}
                        {message.id.startsWith("failed-") && " (Failed)"}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message input */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex items-center space-x-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="image/*,video/*,.pdf"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
                <Input
                  className="flex-1"
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                />
                <Button onClick={sendMessage} disabled={!messageInput.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-gray-50">
            <div className="text-center p-6 max-w-md">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 mb-4">
                <MessageSquarePlus className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No conversation selected
              </h3>
              <p className="text-gray-500 mb-6">
                Select a conversation from the sidebar or start a new one to
                begin messaging.
              </p>
              <Button onClick={() => setNewChatDialogOpen(true)}>
                <MessageSquarePlus className="mr-2 h-4 w-4" />
                New Message
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* User/Group Details Modal */}
      <Dialog open={userDetailsOpen} onOpenChange={setUserDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedConv?.isGroup ? "Group Details" : "User Details"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-20 w-20 border-2 border-black">
                <AvatarFallback>
                  {selectedConv?.isGroup ? (
                    <Users className="h-10 w-10" />
                  ) : (
                    selectedConv?.name.charAt(0)
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <h3 className="text-lg font-semibold">{selectedConv?.name}</h3>
                <p className="text-sm text-gray-500">
                  {selectedConv?.isGroup
                    ? `${selectedConv.participants.length} members`
                    : "Direct message"}
                </p>
                {!selectedConv?.isGroup && (
                  <p className="text-xs text-gray-400 mt-1">
                    Email:{" "}
                    {selectedConv?.participants.find(
                      (p) => p.userId !== user.id
                    )?.userEmail || "N/A"}
                  </p>
                )}
              </div>
            </div>
            {selectedConv?.isGroup && (
              <div>
                <h4 className="font-medium mb-2">Members</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedConv.participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                      onClick={() => {
                        setSelectedUserForDetails(participant);
                        setNestedUserModalOpen(true);
                      }}
                    >
                      <Avatar className="h-8 w-8 border-2 border-black">
                        <AvatarFallback>
                          {participant.userName?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <span className="text-sm font-medium">
                          {participant.userName}
                        </span>
                        <p className="text-xs text-gray-500">
                          {participant.userEmail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Media Modal */}
      <Dialog open={mediaModalOpen} onOpenChange={setMediaModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Media & Files</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Photos</h4>
                <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                  {messages
                    .filter((msg) => msg.mediaType?.startsWith("image/"))
                    .map((message) => (
                      <div key={message.id} className="aspect-square">
                        <img
                          src={message.mediaUrl || ""}
                          alt="Shared photo"
                          className="w-full h-full object-cover rounded cursor-pointer hover:opacity-80"
                          onClick={() =>
                            message.mediaUrl &&
                            window.open(message.mediaUrl, "_blank")
                          }
                        />
                      </div>
                    ))}
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Documents</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {messages
                    .filter(
                      (msg) =>
                        msg.mediaUrl && !msg.mediaType?.startsWith("image/")
                    )
                    .map((message) => (
                      <div
                        key={message.id}
                        className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50 cursor-pointer"
                      >
                        <Paperclip className="h-4 w-4" />
                        <span className="text-sm truncate">
                          {message.content}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            message.mediaUrl &&
                            window.open(message.mediaUrl, "_blank")
                          }
                        >
                          Open
                        </Button>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Nested User Details Modal */}
      <Dialog open={nestedUserModalOpen} onOpenChange={setNestedUserModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-16 w-16 border-2 border-black">
                <AvatarFallback>
                  {selectedUserForDetails?.userName?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <h3 className="text-lg font-semibold">
                  {selectedUserForDetails?.userName}
                </h3>
                <p className="text-sm text-gray-500">
                  {selectedUserForDetails?.userEmail}
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
