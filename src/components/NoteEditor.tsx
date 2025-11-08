import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Trash2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { useDebounce } from "@/hooks/use-debounce";

interface NoteEditorProps {
  selectedNoteId: string | null;
  userId: string;
  onNoteCreated: (id: string) => void;
}

export const NoteEditor = ({ selectedNoteId, userId, onNoteCreated }: NoteEditorProps) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const debouncedTitle = useDebounce(title, 500);
  const debouncedContent = useDebounce(content, 500);

  useEffect(() => {
    if (selectedNoteId) {
      fetchNote();
    } else {
      setTitle("");
      setContent("");
    }
  }, [selectedNoteId]);

  useEffect(() => {
    if (selectedNoteId && (debouncedTitle !== "" || debouncedContent !== "")) {
      saveNote();
    }
  }, [debouncedTitle, debouncedContent]);

  const fetchNote = async () => {
    if (!selectedNoteId) return;

    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', selectedNoteId)
      .single();

    if (!error && data) {
      setTitle(data.title);
      setContent(data.content);
    }
  };

  const saveNote = async () => {
    if (!selectedNoteId) return;

    setIsSaving(true);
    
    const { error } = await supabase
      .from('notes')
      .update({
        title: title || 'Untitled',
        content: content,
      })
      .eq('id', selectedNoteId);

    if (error) {
      toast({
        title: "Error saving note",
        description: error.message,
        variant: "destructive",
      });
    }
    
    setIsSaving(false);
  };

  const deleteNote = async () => {
    if (!selectedNoteId) return;

    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', selectedNoteId);

    if (!error) {
      toast({
        title: "Note deleted",
      });
      setTitle("");
      setContent("");
      onNoteCreated("");
    } else {
      toast({
        title: "Error deleting note",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!selectedNoteId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-editor">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-muted-foreground"
        >
          <p className="text-lg">Select a note or create a new one to start writing</p>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex-1 flex flex-col bg-editor"
    >
      <div className="border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isSaving && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Save className="w-3 h-3 animate-pulse" />
              Saving...
            </div>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={deleteNote}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-8 space-y-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled"
            className="text-4xl font-bold border-0 focus-visible:ring-0 px-0 bg-transparent"
          />

          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start writing..."
            className="min-h-[600px] text-base border-0 focus-visible:ring-0 px-0 resize-none bg-transparent"
          />
        </div>
      </div>
    </motion.div>
  );
};
