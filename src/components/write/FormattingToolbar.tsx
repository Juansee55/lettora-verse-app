import { Bold, Italic, List, Quote, Underline, Heading2 } from "lucide-react";

export type WritingFormat = "bold" | "italic" | "underline" | "heading" | "quote" | "bullet";

interface Props {
  onFormat: (format: WritingFormat) => void;
  compact?: boolean;
}

const actions: { id: WritingFormat; label: string; Icon: typeof Bold }[] = [
  { id: "bold", label: "Negrita", Icon: Bold },
  { id: "italic", label: "Cursiva", Icon: Italic },
  { id: "underline", label: "Subrayado", Icon: Underline },
  { id: "heading", label: "Encabezado", Icon: Heading2 },
  { id: "quote", label: "Cita", Icon: Quote },
  { id: "bullet", label: "Lista", Icon: List },
];

const FormattingToolbar = ({ onFormat, compact = false }: Props) => (
  <div className="flex items-center gap-0.5 overflow-x-auto py-2 border-b border-border" role="toolbar" aria-label="Formato del texto">
    {actions.map(({ id, label, Icon }) => (
      <button
        key={id}
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onFormat(id)}
        aria-label={label}
        title={label}
        className={`${compact ? "p-1.5" : "p-2"} rounded-lg hover:bg-muted active:bg-muted/80 transition-colors flex-shrink-0`}
      >
        <Icon className={`${compact ? "w-3.5 h-3.5" : "w-4 h-4"} text-muted-foreground`} />
      </button>
    ))}
  </div>
);

export default FormattingToolbar;
