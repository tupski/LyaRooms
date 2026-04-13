import React, { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";
import { LogIn, Shield, User } from 'lucide-react';

const Auth = () => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            toast({ variant: "destructive", title: "Login Gagal!", description: error.message });
        } else {
            toast({ title: "Login Berhasil!" });
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-700 to-blue-900 p-4">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-sm mx-auto bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8"
            >
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white">Selamat Datang</h1>
                    <p className="text-gray-300">Silakan masuk untuk melanjutkan</p>
                </div>

                {/* Admin Info */}
                <div className="mb-6 p-4 bg-yellow-500/20 rounded-lg border border-yellow-400/30">
                    <div className="flex items-center gap-2 text-yellow-200 text-sm">
                        <Shield className="h-4 w-4" />
                        <span className="font-semibold">Super Admin Access</span>
                    </div>
                    <p className="text-yellow-100 text-xs mt-1">
                        Gunakan akun admin untuk akses penuh ke semua fitur
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Email</label>
                        <input
                            className="w-full px-4 py-3 rounded-xl bg-white/10 border-2 border-white/20 text-white placeholder-gray-400 focus:ring-4 focus:ring-blue-300 focus:border-blue-400 transition-all outline-none"
                            type="email"
                            placeholder="admin@apartemen.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Password</label>
                        <input
                            className="w-full px-4 py-3 rounded-xl bg-white/10 border-2 border-white/20 text-white placeholder-gray-400 focus:ring-4 focus:ring-blue-300 focus:border-blue-400 transition-all outline-none"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <Button type="submit" className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-bold py-3 text-base rounded-xl shadow-lg" disabled={loading}>
                            {loading ? 'Memuat...' : <><LogIn className="mr-2 h-5 w-5" /> Masuk</>}
                        </Button>
                    </div>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-gray-400 text-xs">
                        Belum punya akun? Hubungi administrator untuk membuat akun.
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default Auth;