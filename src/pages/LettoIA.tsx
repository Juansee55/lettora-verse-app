import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, BookOpen, Users, Wand2, Type, MessageCircle, Loader2, Copy, Check } from "lucide-react";
import { IOSHeader } from "@/components/ios/IOSHeader";
import { BackButton } from "@/components/navigation/BackButton";
import { toast } from "sonner";
import lettoiaLogo from "@/assets/lettoia-logo.png";
import ReactMarkdown from "react-markdown";

type Mode = "chat" | "story" | "name" | "character" | "plot" | "title";
type Msg = { role: "user" | "assistant"; content: string };

const MODES: { id: Mode; label: string; icon: any; hint: string; color: string }[] = [
  { id: "chat", label: "Chat", icon: MessageCircle, hint: "Habla libremente con LettoIA", color: "from-violet-500 to-fuchsia-500" },
  { id: "story", label: "Historias", icon: BookOpen, hint: "Ej: Un relato de misterio en Praga, s.XIX", color: "from-blue-500 to-cyan-500" },
  { id: "character", label: "Personajes", icon: Users, hint: "Ej: Antagonista carismático de una saga fantasy", color: "from-pink-500 to-rose-500" },
  { id: "name", label: "Nombres", icon: Wand2, hint: "Ej: 10 nombres élficos con significado", color: "from-emerald-500 to-teal-500" },
  { id: "plot", label: "Tramas", icon: Sparkles, hint: "Ej: Estructura para una novela de ciencia ficción", color: "from-amber-500 to-orange-500" },
  { id: "title", label: "Títulos", icon: Type, hint: "Ej: Títulos para una novela de thriller romántico", color: "from-purple-500 to-indigo-500" },
];

const LettoIA = () => {
  const [mode, setMode] = useState<Mode>("chat");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const activeMode = MODES.find(m => m.id === mode)!;

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const newMessages: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setStreaming("");

    try {
      abortRef.current = new AbortController();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lettoia-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ mode, messages: newMessages }),
          signal: abortRef.current.signal,
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Error" }));
        toast.error(err.error || "LettoIA no pudo responder");
        setLoading(false);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const l = line.trim();
          if (!l.startsWith("data:")) continue;
          const data = l.slice(5).trim();
          if (data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              full += delta;
              setStreaming(full);
            }
          } catch {}
        }
      }

      setMessages(m => [...m, { role: "assistant", content: full }]);
      setStreaming("");
    } catch (e: any) {
      if (e.name !== "AbortError") toast.error("Error de conexión con LettoIA");
    } finally {
      setLoading(false);
    }
  };

  const copy = (idx: number, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    toast.success("Copiado");
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const reset = () => {
    setMessages([]);
    setStreaming("");
    abortRef.current?.abort();
  };

  return (
    <div className="min-h-screen pb-safe bg-background flex flex-col">
      <IOSHeader
        title="LettoIA"
        leftAction={<BackButton />}
        rightAction={
          messages.length > 0 && (
            <button onClick={reset} className="text-[15px] text-primary">Nuevo</button>
          )
        }
      />

      {/* Mode selector */}
      <div className="px-4 pt-2 pb-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
          {MODES.map(m => {
            const Icon = m.icon;
            const active = m.id === mode;
            return (
              <motion.button
                key={m.id}
                whileTap={{ scale: 0.94 }}
                onClick={() => { setMode(m.id); reset(); }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full whitespace-nowrap text-[13px] font-medium transition-all ${
                  active
                    ? `bg-gradient-to-r ${m.color} text-white shadow-lg`
                    : "bg-card text-muted-foreground border border-border/50"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {m.label}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-4">
        {messages.length === 0 && !streaming && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <motion.img
              src={lettoiaLogo}
              alt="LettoIA"
              className="w-28 h-28 drop-shadow-[0_10px_30px_rgba(139,92,246,0.4)]"
              animate={{ y: [0, -8, 0], rotate: [0, 2, -2, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            <h2 className="mt-5 text-2xl font-display font-bold">
              <span className="bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 bg-clip-text text-transparent">
                Hola, soy LettoIA
              </span>
            </h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-xs">
              Tu compañera creativa. Modo activo: <span className="font-semibold text-foreground">{activeMode.label}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70 italic max-w-xs">{activeMode.hint}</p>
          </motion.div>
        )}

        <div className="space-y-3 max-w-2xl mx-auto">
          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.25 }}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`relative max-w-[85%] px-4 py-2.5 rounded-2xl ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-card border border-border/50 rounded-bl-md"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <>
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-headings:my-2">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                      <button
                        onClick={() => copy(i, m.content)}
                        className="mt-2 text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        {copiedIdx === i ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedIdx === i ? "Copiado" : "Copiar"}
                      </button>
                    </>
                  ) : (
                    <p className="text-[15px] whitespace-pre-wrap leading-relaxed">{m.content}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {streaming && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-bl-md bg-card border border-border/50">
                <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5">
                  <ReactMarkdown>{streaming}</ReactMarkdown>
                </div>
              </div>
            </motion.div>
          )}

          {loading && !streaming && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-card border border-border/50 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">LettoIA está pensando...</span>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="sticky bottom-0 border-t border-border/50 bg-background/85 backdrop-blur-xl pb-safe">
        <div className="flex items-end gap-2 p-3 max-w-2xl mx-auto">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={activeMode.hint}
              rows={1}
              className="w-full max-h-32 resize-none rounded-2xl bg-muted/60 border border-border/50 px-4 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/40"
              disabled={loading}
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={send}
            disabled={loading || !input.trim()}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              input.trim() && !loading
                ? `bg-gradient-to-br ${activeMode.color} text-white shadow-lg`
                : "bg-muted text-muted-foreground"
            }`}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default LettoIA;