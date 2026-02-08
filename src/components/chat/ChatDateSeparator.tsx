interface ChatDateSeparatorProps {
  dateStr: string;
}

const ChatDateSeparator = ({ dateStr }: ChatDateSeparatorProps) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Hoy";
    if (date.toDateString() === yesterday.toDateString()) return "Ayer";
    return date.toLocaleDateString("es-ES", { day: "numeric", month: "long" });
  };

  return (
    <div className="flex items-center justify-center my-3">
      <span className="px-3 py-1 bg-muted/80 backdrop-blur-sm rounded-full text-[11px] font-medium text-muted-foreground">
        {formatDate(dateStr)}
      </span>
    </div>
  );
};

export default ChatDateSeparator;
