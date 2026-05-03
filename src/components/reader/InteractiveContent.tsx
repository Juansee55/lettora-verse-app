import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { MessageCircle } from "lucide-react";
import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";
import ParagraphComments from "./ParagraphComments";

interface InteractiveContentProps {
  content: string;
  chapterId: string;
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  textAlign: string;
}

const InteractiveContent = ({ content, chapterId, fontSize, lineHeight, fontFamily, textAlign }: InteractiveContentProps) => {
  const [activeParagraph, setActiveParagraph] = useState<number | null>(null);
  const [commentCounts, setCommentCounts] = useState<Record<number, number>>({});

  const paragraphs = content.split("\n").filter(p => p.trim().length > 0);

  useEffect(() => {
    fetchCommentCounts();
  }, [chapterId]);

  const fetchCommentCounts = async () => {
    const { data } = await supabase
      .from("paragraph_comments")
      .select("paragraph_index")
      .eq("chapter_id", chapterId);

    if (data) {
      const counts: Record<number, number> = {};
      data.forEach((c: any) => {
        counts[c.paragraph_index] = (counts[c.paragraph_index] || 0) + 1;
      });
      setCommentCounts(counts);
    }
  };

  return (
    <>
      <div className="space-y-0">
        {paragraphs.map((paragraph, index) => (
          <div key={index} className="group relative">
            <p
              style={{ fontSize: `${fontSize}px`, lineHeight, fontFamily, textAlign: textAlign as any }}
              className="leading-relaxed py-1"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(paragraph, { USE_PROFILES: { html: true } }) }}
            />
            <button
              onClick={(e) => { e.stopPropagation(); setActiveParagraph(index); }}
              className={`absolute -right-1 top-1 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                commentCounts[index]
                  ? "bg-primary/10 text-primary opacity-100"
                  : "bg-muted/50 text-muted-foreground opacity-0 group-hover:opacity-100"
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              {commentCounts[index] ? (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[9px] rounded-full flex items-center justify-center font-bold">
                  {commentCounts[index]}
                </span>
              ) : null}
            </button>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {activeParagraph !== null && (
          <ParagraphComments
            chapterId={chapterId}
            paragraphIndex={activeParagraph}
            onClose={() => { setActiveParagraph(null); fetchCommentCounts(); }}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default InteractiveContent;
