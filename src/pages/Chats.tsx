import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Plus, MessageCircle, MoreVertical, Check, CheckCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/navigation/BottomNav";

const chats = [
  {
    id: "1",
    name: "María García",
    avatar: "M",
    lastMessage: "¡Me encantó tu último capítulo!",
    time: "2m",
    unread: 3,
    online: true,
  },
  {
    id: "2",
    name: "Carlos Ruiz",
    avatar: "C",
    lastMessage: "¿Quieres colaborar en mi nueva saga?",
    time: "15m",
    unread: 1,
    online: true,
  },
  {
    id: "3",
    name: "Club de Lectura",
    avatar: "📚",
    lastMessage: "Ana: El próximo libro será...",
    time: "1h",
    unread: 0,
    online: false,
    isGroup: true,
  },
  {
    id: "4",
    name: "Pedro Martín",
    avatar: "P",
    lastMessage: "Gracias por el feedback",
    time: "3h",
    unread: 0,
    online: false,
  },
  {
    id: "5",
    name: "Escritores Fantasy",
    avatar: "✨",
    lastMessage: "Elena: Nuevo desafío de escritura",
    time: "5h",
    unread: 12,
    online: false,
    isGroup: true,
  },
];

const ChatsPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const filteredChats = chats.filter((chat) =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-display font-bold">Mensajes</h1>
            <Button variant="ghost" size="icon">
              <Plus className="w-5 h-5" />
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar conversaciones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-12 rounded-xl bg-muted/50"
            />
          </div>
        </div>
      </motion.header>

      {/* Online users */}
      <div className="px-4 py-4 border-b border-border">
        <div className="flex gap-4 overflow-x-auto">
          {chats
            .filter((c) => c.online)
            .map((chat, index) => (
              <motion.div
                key={chat.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="flex flex-col items-center gap-1"
              >
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-lg font-display font-bold text-primary-foreground">
                    {chat.avatar}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-background rounded-full" />
                </div>
                <span className="text-xs text-muted-foreground truncate max-w-[60px]">
                  {chat.name.split(" ")[0]}
                </span>
              </motion.div>
            ))}
        </div>
      </div>

      {/* Chat list */}
      <div className="px-4 py-2">
        {filteredChats.map((chat, index) => (
          <motion.div
            key={chat.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => navigate(`/chat/${chat.id}`)}
            className="flex items-center gap-3 py-3 border-b border-border/50 cursor-pointer hover:bg-muted/30 transition-colors rounded-xl px-2 -mx-2"
          >
            <div className="relative flex-shrink-0">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-display font-bold ${
                  chat.isGroup
                    ? "bg-secondary text-2xl"
                    : "bg-gradient-to-br from-violet-400 to-violet-600 text-primary-foreground"
                }`}
              >
                {chat.avatar}
              </div>
              {chat.online && (
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-background rounded-full" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-medium truncate">{chat.name}</h3>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {chat.time}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground truncate pr-2">
                  {chat.lastMessage}
                </p>
                {chat.unread > 0 && (
                  <span className="flex-shrink-0 w-5 h-5 bg-primary rounded-full text-[10px] text-primary-foreground flex items-center justify-center font-medium">
                    {chat.unread > 9 ? "9+" : chat.unread}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* FAB for new message */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: "spring" }}
        className="fixed bottom-24 right-4 w-14 h-14 bg-gradient-hero rounded-2xl shadow-glow flex items-center justify-center z-50"
      >
        <MessageCircle className="w-6 h-6 text-primary-foreground" />
      </motion.button>

      <BottomNav />
    </div>
  );
};

export default ChatsPage;
