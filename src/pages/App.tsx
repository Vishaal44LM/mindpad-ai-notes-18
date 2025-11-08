import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { NoteSidebar } from "@/components/NoteSidebar";
import { NoteEditor } from "@/components/NoteEditor";
import { AIPanel } from "@/components/AIPanel";
import { AppHeader } from "@/components/AppHeader";
import { motion } from "framer-motion";

const AppPage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (!user || !session) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader user={user} />
      
      <motion.div 
        className="flex-1 flex overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <NoteSidebar 
          selectedNoteId={selectedNoteId} 
          onSelectNote={setSelectedNoteId}
          userId={user.id}
        />
        
        <NoteEditor 
          selectedNoteId={selectedNoteId}
          userId={user.id}
          onNoteCreated={setSelectedNoteId}
        />
        
        <AIPanel 
          selectedNoteId={selectedNoteId}
          userId={user.id}
        />
      </motion.div>
    </div>
  );
};

export default AppPage;
