#!/usr/bin/env node
/* eslint-env node */
/* global process */

import { createClient } from '@supabase/supabase-js';
import readline from 'readline';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Env wajib: VITE_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((r) => rl.question(q, r));

async function main() {
  try {
    const full_name = (await ask('Nama lengkap: ')).trim();
    const phone = (await ask('No HP: ')).trim();
    const email = (await ask('Email: ')).trim().toLowerCase();
    const password = await ask('Password (min 6): ');
    const role = (await ask('Role (karyawan/admin): ')).trim().toLowerCase();

    if (!full_name || !phone || !email || !password) throw new Error('Semua field wajib diisi.');
    if (password.length < 6) throw new Error('Password minimal 6 karakter.');
    if (!['karyawan', 'admin'].includes(role)) throw new Error('Role harus karyawan/admin.');

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, phone, role }
    });
    if (error) throw error;

    const userId = data.user?.id;
    if (!userId) throw new Error('User ID tidak ditemukan setelah createUser.');

    const { error: roleErr } = await supabase
      .from('user_roles')
      .upsert({ user_id: userId, role }, { onConflict: 'user_id' });
    if (roleErr) throw roleErr;

    const { error: profileErr } = await supabase
      .from('user_profiles')
      .upsert({ id: userId, email, full_name, phone, role }, { onConflict: 'id' });
    if (profileErr) throw profileErr;

    console.log('Sukses buat akun:', userId);
  } catch (e) {
    console.error('Gagal:', e.message);
    process.exitCode = 1;
  } finally {
    rl.close();
  }
}

main();
