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
        .single();

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

    return () => subscription.unsubscribe();
  }, [handleSession]);

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
    const { error } = await supabase.auth.signOut();

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign out Failed",
        description: error.message || "Something went wrong",
      });
    }

    return { error };
  }, [toast]);

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
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};