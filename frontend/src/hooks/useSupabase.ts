import { useCallback } from "react";
import { supabase } from "../services/supabaseClient";

export function useSupabase() {
  // Autenticación
  const signUpWithPhone = useCallback(async (phone: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUpWithPassword({
        email: `${phone}@sudtalent.local`,
        password,
      });
      if (error) throw error;
      return { user: data.user, session: data.session, error: null };
    } catch (error) {
      console.error("Sign up error:", error);
      return { user: null, session: null, error };
    }
  }, []);

  const signInWithPhone = useCallback(async (phone: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: `${phone}@sudtalent.local`,
        password,
      });
      if (error) throw error;
      return { user: data.user, session: data.session, error: null };
    } catch (error) {
      console.error("Sign in error:", error);
      return { user: null, session: null, error };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error("Sign out error:", error);
      return { error };
    }
  }, []);

  // Operaciones de base de datos
  const insertData = useCallback(
    async (table: string, data: any) => {
      try {
        const { data: result, error } = await supabase
          .from(table)
          .insert(data)
          .select();
        if (error) throw error;
        return { data: result, error: null };
      } catch (error) {
        console.error(`Insert error on ${table}:`, error);
        return { data: null, error };
      }
    },
    []
  );

  const getData = useCallback(
    async (table: string, query?: any) => {
      try {
        let q = supabase.from(table).select("*");
        
        if (query?.eq) {
          Object.entries(query.eq).forEach(([key, value]) => {
            q = q.eq(key, value);
          });
        }
        
        if (query?.order) {
          q = q.order(query.order.column, { ascending: query.order.ascending ?? true });
        }
        
        if (query?.limit) {
          q = q.limit(query.limit);
        }

        const { data, error } = await q;
        if (error) throw error;
        return { data, error: null };
      } catch (error) {
        console.error(`Get error on ${table}:`, error);
        return { data: null, error };
      }
    },
    []
  );

  const updateData = useCallback(
    async (table: string, id: string, updates: any) => {
      try {
        const { data, error } = await supabase
          .from(table)
          .update(updates)
          .eq("id", id)
          .select();
        if (error) throw error;
        return { data, error: null };
      } catch (error) {
        console.error(`Update error on ${table}:`, error);
        return { data: null, error };
      }
    },
    []
  );

  const deleteData = useCallback(
    async (table: string, id: string) => {
      try {
        const { error } = await supabase.from(table).delete().eq("id", id);
        if (error) throw error;
        return { error: null };
      } catch (error) {
        console.error(`Delete error on ${table}:`, error);
        return { error };
      }
    },
    []
  );

  // Storage (para archivos)
  const uploadFile = useCallback(
    async (bucket: string, path: string, file: File) => {
      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(path, file, { upsert: true });
        if (error) throw error;
        return { data, error: null };
      } catch (error) {
        console.error(`Upload error:`, error);
        return { data: null, error };
      }
    },
    []
  );

  const downloadFile = useCallback(
    async (bucket: string, path: string) => {
      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .download(path);
        if (error) throw error;
        return { data, error: null };
      } catch (error) {
        console.error(`Download error:`, error);
        return { data: null, error };
      }
    },
    []
  );

  return {
    // Auth
    signUpWithPhone,
    signInWithPhone,
    signOut,
    // Database
    insertData,
    getData,
    updateData,
    deleteData,
    // Storage
    uploadFile,
    downloadFile,
  };
}
