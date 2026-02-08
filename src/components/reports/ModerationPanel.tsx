import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Flag,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  BookOpen,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Report {
  id: string;
  reporter_id: string;
  content_type: string;
  content_id: string;
  reason: string;
  description: string | null;
  status: string;
  admin_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  // Enriched
  reporter_name?: string;
  content_title?: string;
  content_author?: string;
}

interface ModerationPanelProps {
  isAdmin: boolean;
}

const REASON_LABELS: Record<string, string> = {
  spam: "Spam",
  harassment: "Acoso",
  inappropriate: "Inapropiado",
  copyright: "Copyright",
  other: "Otro",
};

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  pending: { label: "Pendiente", icon: Clock, color: "text-amber-500" },
  reviewed: { label: "Revisado", icon: Eye, color: "text-blue-500" },
  resolved: { label: "Resuelto", icon: CheckCircle, color: "text-green-500" },
  dismissed: { label: "Desestimado", icon: XCircle, color: "text-muted-foreground" },
};

const ModerationPanel = ({ isAdmin }: ModerationPanelProps) => {
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) fetchReports();
  }, [isAdmin, filter]);

  const fetchReports = async () => {
    setLoading(true);

    let query = supabase
      .from("content_reports" as any)
      .select("*")
      .order("created_at", { ascending: false }) as any;

    if (filter === "pending") {
      query = query.in("status", ["pending", "reviewed"]);
    }

    const { data, error } = await query.limit(100);

    if (error) {
      console.error("Error fetching reports:", error);
      setLoading(false);
      return;
    }

    // Enrich reports with content info
    const enrichedReports = await Promise.all(
      (data || []).map(async (report: any) => {
        // Get reporter name
        const { data: reporter } = await supabase
          .from("profiles")
          .select("display_name, username")
          .eq("id", report.reporter_id)
          .maybeSingle();

        let content_title = "";
        let content_author = "";

        if (report.content_type === "book") {
          const { data: book } = await supabase
            .from("books")
            .select("title, profiles:author_id (display_name, username)")
            .eq("id", report.content_id)
            .maybeSingle();
          content_title = book?.title || "Libro eliminado";
          content_author = (book?.profiles as any)?.display_name || (book?.profiles as any)?.username || "";
        } else if (report.content_type === "microstory") {
          const { data: story } = await supabase
            .from("microstories")
            .select("title, content, profiles:author_id (display_name, username)")
            .eq("id", report.content_id)
            .maybeSingle();
          content_title = story?.title || story?.content?.slice(0, 50) + "..." || "Microrrelato eliminado";
          content_author = (story?.profiles as any)?.display_name || (story?.profiles as any)?.username || "";
        }

        return {
          ...report,
          reporter_name: reporter?.display_name || reporter?.username || "Usuario",
          content_title,
          content_author,
        } as Report;
      })
    );

    setReports(enrichedReports);
    setLoading(false);
  };

  const updateReportStatus = async (reportId: string, newStatus: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setUpdatingId(reportId);

    const updateData: any = {
      status: newStatus,
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
    };

    if (adminNotes[reportId]) {
      updateData.admin_notes = adminNotes[reportId];
    }

    const { error } = await (supabase
      .from("content_reports" as any)
      .update(updateData)
      .eq("id", reportId) as any);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el reporte.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Reporte actualizado",
        description: `Estado cambiado a "${STATUS_CONFIG[newStatus]?.label || newStatus}".`,
      });
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId
            ? { ...r, status: newStatus, resolved_by: user.id, resolved_at: new Date().toISOString(), admin_notes: adminNotes[reportId] || r.admin_notes }
            : r
        )
      );
    }
    setUpdatingId(null);
  };

  const deleteContent = async (report: Report) => {
    if (report.content_type === "book") {
      await supabase.from("books").delete().eq("id", report.content_id);
    } else if (report.content_type === "microstory") {
      await supabase.from("microstories").delete().eq("id", report.content_id);
    }
    await updateReportStatus(report.id, "resolved");
    toast({
      title: "Contenido eliminado",
      description: "El contenido reportado ha sido eliminado.",
    });
  };

  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return "ahora";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  const pendingCount = reports.filter((r) => r.status === "pending").length;

  if (!isAdmin) return null;

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flag className="w-5 h-5 text-destructive" />
          <h2 className="font-display font-bold text-lg">Moderación</h2>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 bg-destructive text-destructive-foreground text-xs rounded-full font-semibold">
              {pendingCount}
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setFilter("pending")}
            className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
              filter === "pending" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            Pendientes
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
              filter === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            Todos
          </button>
        </div>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : reports.length === 0 ? (
        <div className="ios-section p-8 text-center">
          <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
          <p className="font-medium">Sin reportes pendientes</p>
          <p className="text-[13px] text-muted-foreground">Todo limpio por ahora 🎉</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report, index) => {
            const statusConf = STATUS_CONFIG[report.status] || STATUS_CONFIG.pending;
            const StatusIcon = statusConf.icon;
            const isExpanded = expandedId === report.id;

            return (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="ios-section overflow-hidden"
              >
                {/* Report Header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : report.id)}
                  className="w-full p-4 flex items-center gap-3 text-left active:bg-muted/50 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    report.status === "pending" ? "bg-amber-500/10" : "bg-muted"
                  }`}>
                    {report.content_type === "book" ? (
                      <BookOpen className="w-5 h-5 text-amber-500" />
                    ) : (
                      <Sparkles className="w-5 h-5 text-violet-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-[14px] truncate">{report.content_title}</h4>
                      <span className={`flex items-center gap-1 text-[11px] font-medium ${statusConf.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConf.label}
                      </span>
                    </div>
                    <p className="text-[12px] text-muted-foreground">
                      {REASON_LABELS[report.reason] || report.reason} • por {report.reporter_name} • {timeAgo(report.created_at)}
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  )}
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="border-t border-border"
                  >
                    <div className="p-4 space-y-3">
                      {/* Content Info */}
                      <div className="bg-muted/50 rounded-xl p-3">
                        <p className="text-[13px] text-muted-foreground mb-1">Contenido reportado</p>
                        <p className="text-[14px] font-medium">{report.content_title}</p>
                        {report.content_author && (
                          <p className="text-[12px] text-muted-foreground">Autor: {report.content_author}</p>
                        )}
                      </div>

                      {/* Description */}
                      {report.description && (
                        <div className="bg-muted/50 rounded-xl p-3">
                          <p className="text-[13px] text-muted-foreground mb-1">Descripción del reporte</p>
                          <p className="text-[14px]">{report.description}</p>
                        </div>
                      )}

                      {/* Admin Notes */}
                      {report.status === "pending" || report.status === "reviewed" ? (
                        <div>
                          <p className="text-[13px] text-muted-foreground mb-1.5">Notas del admin</p>
                          <Textarea
                            placeholder="Añadir notas..."
                            value={adminNotes[report.id] || ""}
                            onChange={(e) =>
                              setAdminNotes((prev) => ({ ...prev, [report.id]: e.target.value }))
                            }
                            className="min-h-[60px] text-[14px] border-0 bg-muted/50 focus-visible:ring-1 resize-none rounded-xl"
                          />
                        </div>
                      ) : report.admin_notes ? (
                        <div className="bg-muted/50 rounded-xl p-3">
                          <p className="text-[13px] text-muted-foreground mb-1">Notas del admin</p>
                          <p className="text-[14px]">{report.admin_notes}</p>
                        </div>
                      ) : null}

                      {/* Actions */}
                      {(report.status === "pending" || report.status === "reviewed") && (
                        <div className="flex gap-2 pt-1">
                          <Button
                            variant="destructive"
                            size="sm"
                            className="flex-1 rounded-xl"
                            onClick={() => deleteContent(report)}
                            disabled={updatingId === report.id}
                          >
                            {updatingId === report.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                                Eliminar contenido
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 rounded-xl"
                            onClick={() => updateReportStatus(report.id, "dismissed")}
                            disabled={updatingId === report.id}
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            Desestimar
                          </Button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ModerationPanel;
