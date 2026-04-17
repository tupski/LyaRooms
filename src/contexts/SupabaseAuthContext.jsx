import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();

  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  const handleSession = useCallback(async (session) => {
    setLoading(true);
    setSession(session);
    setUser(session?.user ?? null);

    // Cek peran pengguna
    if (session?.user) {
      await checkUserRole(session.user.id);
    } else {
      setUserRole(null);
    }

    setLoading(false);
  }, []);

  const checkUserRole = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') { // PGRST116 = tidak ada baris
        console.error('Error checking user role:', error);
        setUserRole('karyawan'); // Peran default
      } else if (data) {
        setUserRole(data.role);
      } else {
        // Jika belum ada peran, cek metadata admin
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.user_metadata?.role === 'super_admin') {
          // Buat entri peran jika belum ada
          await supabase.from('user_roles').insert({
            user_id: userId,
            role: 'super_admin'
          });
          setUserRole('super_admin');
        } else {
          setUserRole('karyawan');
        }
      }
    } catch (error) {
      console.error('Error in checkUserRole:', error);
      setUserRole('karyawan');
    }
  }, []);

  const isSuperAdmin = useMemo(() => userRole === 'super_admin', [userRole]);
  const isAdmin = useMemo(() => userRole === 'admin' || userRole === 'super_admin', [userRole]);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      handleSession(session);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        handleSession(session);
      }
    );

    // Realtime role listener
    let roleChannel = null;
    const userId = session?.user?.id;
    
    if (userId) {
      roleChannel = supabase
        .channel(`role_sync_${userId}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'user_roles', 
          filter: `user_id=eq.${userId}` 
        }, () => checkUserRole(userId))
        .subscribe();
    }

    return () => {
      subscription.unsubscribe();
      if (roleChannel) {
        supabase.removeChannel(roleChannel);
      }
    };
  }, [handleSession, session?.user?.id, checkUserRole]);

  const signUp = useCallback(async (email, password, options) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign up Failed",
        description: error.message || "Something went wrong",
      });
    }

    return { error };
  }, [toast]);

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign in Failed",
        description: error.message || "Something went wrong",
      });
    }

    return { error };
  }, [toast]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Signout error:", e);
    } finally {
      // Clear persistent states AFTER signout attempt
      localStorage.clear();
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        } catch (e) {}
      }
      window.location.reload(); // Hard reload to clear all in-memory state
    }
  }, []);

  const refreshSession = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    await handleSession(session);
  }, [handleSession]);

  const value = useMemo(() => ({
    user,
    session,
    loading,
    userRole,
    isSuperAdmin,
    isAdmin,
    signUp,
    signIn,
    signOut,
    refreshSession,
  }), [user, session, loading, userRole, isSuperAdmin, isAdmin, signUp, signIn, signOut, refreshSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    return { loading: true, user: null, session: null, userRole: null, isSuperAdmin: false, isAdmin: false };
  }
  return context;
};