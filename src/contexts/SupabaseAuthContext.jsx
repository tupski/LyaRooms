import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  // Gunakan fungsi toast langsung (bukan hook) untuk menghindari masalah urutan render/context

  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [isSyncingRole, setIsSyncingRole] = useState(false);

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

  const handleSession = useCallback(async (currentSession) => {
    setLoading(true);
    setSession(currentSession);
    setUser(currentSession?.user ?? null);

    if (currentSession?.user) {
      setIsSyncingRole(true);
      await checkUserRole(currentSession.user.id);
      setIsSyncingRole(false);
    } else {
      setUserRole(null);
    }

    setLoading(false);
  }, [checkUserRole]);

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
  }, []);

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
  }, []);

  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Signout error:", e);
    } finally {
      // Clear persistent states safely
      const itemsToKeep = ['app_version'];
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (!itemsToKeep.includes(key)) {
          localStorage.removeItem(key);
        }
      });
      sessionStorage.clear();
      
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        } catch (e) {}
      }
      window.location.reload(); 
    }
  }, []);

  const refreshSession = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    await handleSession(session);
  }, [handleSession]);

  const value = useMemo(() => ({
    user,
    session,
    loading: loading || isSyncingRole,
    userRole,
    isSuperAdmin,
    isAdmin,
    signUp,
    signIn,
    signOut,
    refreshSession,
  }), [user, session, loading, isSyncingRole, userRole, isSuperAdmin, isAdmin, signUp, signIn, signOut, refreshSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    return { loading: true, user: null, session: null, userRole: null, isSuperAdmin: false, isAdmin: false };
  }
  return context;
};