import { useNavigate } from "react-router-dom";

interface RichContentRendererProps {
  content: string;
  className?: string;
}

/**
 * Renders text with clickable #hashtags and @mentions highlighted
 */
const RichContentRenderer = ({ content, className = "" }: RichContentRendererProps) => {
  const navigate = useNavigate();

  const parts = content.split(/([@#]\w+)/g);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.startsWith("#")) {
          const tag = part.slice(1).toLowerCase();
          return (
            <span
              key={i}
              onClick={(e) => { e.stopPropagation(); navigate(`/hashtag/${tag}`); }}
              className="text-primary font-medium cursor-pointer hover:underline"
            >
              {part}
            </span>
          );
        }
        if (part.startsWith("@")) {
          return (
            <span
              key={i}
              className="text-primary font-medium cursor-pointer hover:underline"
              onClick={(e) => { e.stopPropagation(); }}
            >
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
};

export default RichContentRenderer;
