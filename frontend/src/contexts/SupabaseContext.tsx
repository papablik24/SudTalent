import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";

interface SupabaseContextType {
  isConnected: boolean;
  error: string | null;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testConnection = async () => {
      try {
        const { data, error: err } = await supabase
          .from("users")
          .select("id")
          .limit(1);

        if (err) {
          setError(err.message);
          setIsConnected(false);
        } else {
          setError(null);
          setIsConnected(true);
          console.log("? Supabase connected successfully");
        }
      } catch (e) {
        setError(String(e));
        setIsConnected(false);
      }
    };

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      testConnection();
    } else {
      setError("Supabase credentials not configured");
      setIsConnected(false);
    }
  }, []);

  return (
    <SupabaseContext.Provider value={{ isConnected, error }}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabaseContext() {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error("useSupabaseContext must be used within SupabaseProvider");
  }
  return context;
}
