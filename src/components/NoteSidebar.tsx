import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Search, FileText, Tag } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface NoteSidebarProps {
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  userId: string;
}

export const NoteSidebar = ({ selectedNoteId, onSelectNote, userId }: NoteSidebarProps) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotes();
    
    const channel = supabase
      .channel('notes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notes',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchNotes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchNotes = async () => {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setNotes(data);
    }
    setLoading(false);
  };

  const createNote = async () => {
    const { data, error } = await supabase
      .from('notes')
      .insert([
        {
          user_id: userId,
          title: 'Untitled',
          content: '',
        },
      ])
      .select()
      .single();

    if (!error && data) {
      onSelectNote(data.id);
    }
  };

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-64 border-r border-border bg-sidebar flex flex-col"
    >
      <div className="p-4 space-y-3">
        <Button onClick={createNote} className="w-full" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          New Note
        </Button>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {loading ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              Loading notes...
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              {searchQuery ? "No notes found" : "No notes yet"}
            </div>
          ) : (
            filteredNotes.map((note) => (
              <motion.button
                key={note.id}
                onClick={() => onSelectNote(note.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "w-full text-left p-3 rounded-lg transition-colors",
                  "hover:bg-sidebar-accent",
                  selectedNoteId === note.id && "bg-sidebar-accent"
                )}
              >
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {note.title || "Untitled"}
                    </div>
                    <div className="text-xs text-muted-foreground truncate mt-1">
                      {note.content.slice(0, 60) || "Empty note"}
                    </div>
                  </div>
                </div>
              </motion.button>
            ))
          )}
        </div>
      </ScrollArea>
    </motion.div>
  );
};
