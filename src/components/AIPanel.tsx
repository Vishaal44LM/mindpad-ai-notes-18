import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, RefreshCw, Lightbulb, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

interface AIPanelProps {
  selectedNoteId: string | null;
  userId: string;
}

interface AIHistory {
  id: string;
  prompt: string;
  ai_response: string;
  created_at: string;
}

export const AIPanel = ({ selectedNoteId, userId }: AIPanelProps) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [aiHistory, setAiHistory] = useState<AIHistory[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (selectedNoteId) {
      fetchAIHistory();
    } else {
      setAiHistory([]);
    }
  }, [selectedNoteId]);

  const fetchAIHistory = async () => {
    if (!selectedNoteId) return;

    const { data, error } = await supabase
      .from('ai_history')
      .select('*')
      .eq('note_id', selectedNoteId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAiHistory(data);
    }
  };

  const handleAIAction = async (action: string) => {
    if (!selectedNoteId) {
      toast({
        title: "No note selected",
        description: "Please select a note first",
        variant: "destructive",
      });
      return;
    }

    setLoading(action);

    try {
      const { data: noteData } = await supabase
        .from('notes')
        .select('content')
        .eq('id', selectedNoteId)
        .single();

      if (!noteData?.content) {
        toast({
          title: "Empty note",
          description: "Add some content first",
          variant: "destructive",
        });
        setLoading(null);
        return;
      }

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          action,
          content: noteData.content,
          noteId: selectedNoteId,
        },
      });

      if (error) {
        if (error.message.includes('429')) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (error.message.includes('402')) {
          throw new Error('AI credits exhausted. Please add credits in Settings.');
        }
        throw error;
      }

      toast({
        title: "AI Processing Complete",
        description: `${action} completed successfully`,
      });

      fetchAIHistory();
    } catch (error: any) {
      toast({
        title: "AI Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <motion.div
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-80 border-l border-border bg-aiPanel flex flex-col"
    >
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          AI Assistant
        </h2>
      </div>

      <div className="p-4 space-y-2">
        <Button
          onClick={() => handleAIAction("summarize")}
          disabled={!selectedNoteId || loading !== null}
          variant="outline"
          className="w-full justify-start"
          size="sm"
        >
          <FileText className="w-4 h-4 mr-2" />
          {loading === "summarize" ? "Processing..." : "Summarize"}
        </Button>

        <Button
          onClick={() => handleAIAction("rewrite_formal")}
          disabled={!selectedNoteId || loading !== null}
          variant="outline"
          className="w-full justify-start"
          size="sm"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          {loading === "rewrite_formal" ? "Processing..." : "Rewrite (Formal)"}
        </Button>

        <Button
          onClick={() => handleAIAction("rewrite_concise")}
          disabled={!selectedNoteId || loading !== null}
          variant="outline"
          className="w-full justify-start"
          size="sm"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          {loading === "rewrite_concise" ? "Processing..." : "Rewrite (Concise)"}
        </Button>

        <Button
          onClick={() => handleAIAction("generate_ideas")}
          disabled={!selectedNoteId || loading !== null}
          variant="outline"
          className="w-full justify-start"
          size="sm"
        >
          <Lightbulb className="w-4 h-4 mr-2" />
          {loading === "generate_ideas" ? "Processing..." : "Generate Ideas"}
        </Button>
      </div>

      <div className="flex-1 p-4 overflow-hidden">
        <h3 className="text-sm font-medium mb-3">AI History</h3>
        <ScrollArea className="h-full">
          <div className="space-y-3">
            {aiHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No AI interactions yet. Try using the AI tools above!
              </p>
            ) : (
              aiHistory.map((item) => (
                <Card key={item.id} className="p-3 space-y-2">
                  <div className="text-xs font-medium text-primary">
                    {item.prompt}
                  </div>
                  <div className="text-sm text-foreground whitespace-pre-wrap">
                    {item.ai_response}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleString()}
                  </div>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </motion.div>
  );
};
