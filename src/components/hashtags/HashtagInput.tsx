import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Hash } from "lucide-react";

interface HashtagSuggestion {
  id: string;
  name: string;
  usage_count: number;
}

interface HashtagInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
  maxLength?: number;
}

const HashtagInput = ({ value, onChange, placeholder, className = "", multiline = false, maxLength }: HashtagInputProps) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<HashtagSuggestion[]>([]);
  const [hashtagQuery, setHashtagQuery] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  const extractHashtagQuery = (text: string, pos: number) => {
    const before = text.slice(0, pos);
    const match = before.match(/#(\w{0,30})$/);
    return match ? match[1] : null;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const newValue = maxLength ? e.target.value.slice(0, maxLength) : e.target.value;
    onChange(newValue);
    const pos = e.target.selectionStart || 0;
    setCursorPosition(pos);

    const query = extractHashtagQuery(newValue, pos);
    if (query !== null && query.length > 0) {
      setHashtagQuery(query);
      setShowSuggestions(true);
      setSelectedIndex(0);
    } else {
      setShowSuggestions(false);
    }
  };

  useEffect(() => {
    if (!hashtagQuery || !showSuggestions) return;
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("hashtags")
        .select("id, name, usage_count")
        .ilike("name", `%${hashtagQuery.toLowerCase()}%`)
        .order("usage_count", { ascending: false })
        .limit(5);
      setSuggestions(data || []);
    }, 200);
    return () => clearTimeout(timer);
  }, [hashtagQuery, showSuggestions]);

  const insertHashtag = (tag: HashtagSuggestion) => {
    const before = value.slice(0, cursorPosition);
    const after = value.slice(cursorPosition);
    const hashStart = before.lastIndexOf("#");
    const newText = before.slice(0, hashStart) + `#${tag.name} ` + after;
    onChange(newText);
    setShowSuggestions(false);
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
      insertHashtag(suggestions[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
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
        onClick={(e: any) => {
          const pos = e.target.selectionStart || 0;
          setCursorPosition(pos);
          const query = extractHashtagQuery(value, pos);
          if (query !== null && query.length > 0) {
            setHashtagQuery(query);
            setShowSuggestions(true);
          }
        }}
      />

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
          {suggestions.map((tag, i) => (
            <button
              key={tag.id}
              onClick={() => insertHashtag(tag)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                i === selectedIndex ? "bg-primary/10" : "hover:bg-muted/50"
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Hash className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">#{tag.name}</p>
                <p className="text-xs text-muted-foreground">{tag.usage_count} publicaciones</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default HashtagInput;
