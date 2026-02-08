import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface MentionUser {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onMentionsChange?: (userIds: string[]) => void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
  maxLength?: number;
  disabled?: boolean;
}

const MentionInput = ({
  value,
  onChange,
  onMentionsChange,
  placeholder,
  className = "",
  multiline = false,
  maxLength,
  disabled = false,
}: MentionInputProps) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<MentionUser[]>([]);
  const [mentionQuery, setMentionQuery] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const extractMentionQuery = useCallback((text: string, pos: number) => {
    const before = text.slice(0, pos);
    const match = before.match(/@(\w{0,20})$/);
    return match ? match[1] : null;
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const newValue = maxLength ? e.target.value.slice(0, maxLength) : e.target.value;
    onChange(newValue);
    const pos = e.target.selectionStart || 0;
    setCursorPosition(pos);

    const query = extractMentionQuery(newValue, pos);
    if (query !== null) {
      setMentionQuery(query);
      setShowSuggestions(true);
      setSelectedIndex(0);
    } else {
      setShowSuggestions(false);
    }
  };

  useEffect(() => {
    if (!mentionQuery || !showSuggestions) return;
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .or(`username.ilike.%${mentionQuery}%,display_name.ilike.%${mentionQuery}%`)
        .limit(5);
      setSuggestions(data || []);
    }, 200);
    return () => clearTimeout(timer);
  }, [mentionQuery, showSuggestions]);

  const insertMention = (user: MentionUser) => {
    const before = value.slice(0, cursorPosition);
    const after = value.slice(cursorPosition);
    const mentionStart = before.lastIndexOf("@");
    const newText = before.slice(0, mentionStart) + `@${user.username} ` + after;
    onChange(newText);
    setShowSuggestions(false);

    // Extract all mentioned usernames and resolve IDs
    const allMentions = newText.match(/@(\w+)/g) || [];
    if (onMentionsChange) {
      const usernames = allMentions.map(m => m.slice(1));
      supabase
        .from("profiles")
        .select("id")
        .in("username", usernames)
        .then(({ data }) => {
          if (data) onMentionsChange(data.map(d => d.id));
        });
    }

    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" && showSuggestions) {
      e.preventDefault();
      insertMention(suggestions[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  // Render text with highlighted mentions
  const renderHighlightedText = () => {
    return value.replace(/@(\w+)/g, (match) => match);
  };

  const InputComponent = multiline ? "textarea" : "input";

  return (
    <div className="relative">
      <InputComponent
        ref={inputRef as any}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full ${className}`}
        disabled={disabled}
        onClick={(e: any) => {
          const pos = e.target.selectionStart || 0;
          setCursorPosition(pos);
          const query = extractMentionQuery(value, pos);
          if (query !== null) {
            setMentionQuery(query);
            setShowSuggestions(true);
          }
        }}
      />

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto"
        >
          {suggestions.map((user, i) => (
            <button
              key={user.id}
              onClick={() => insertMention(user)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                i === selectedIndex ? "bg-primary/10" : "hover:bg-muted/50"
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/60 to-primary flex items-center justify-center text-primary-foreground text-xs font-bold overflow-hidden flex-shrink-0">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  (user.display_name || user.username || "?")[0].toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{user.display_name || "Usuario"}</p>
                <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MentionInput;
