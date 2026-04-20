#!/usr/bin/env node
/* eslint-env node */
/* global process */

/**
 * Script untuk membuat akun Super Admin
 * Jalankan dengan: node create-super-admin.js
 */

import { createClient } from '@supabase/supabase-js';
import readline from 'readline';
import { config } from 'dotenv';

// Load environment variables
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Environment variables tidak ditemukan!');
  console.log('Pastikan file .env sudah dibuat dengan:');
  console.log('VITE_SUPABASE_URL=your-supabase-url');
  console.log('VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-supabase-key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function createSuperAdmin() {
  try {
    console.log('🏢 Aplikasi Manajemen Apartemen - Pembuatan Super Admin');
    console.log('=' .repeat(60));

    const email = await askQuestion('Masukkan email untuk Super Admin: ');
    const password = await askQuestion('Masukkan password (minimal 6 karakter): ');

    if (!email || !password) {
      console.log('❌ Email dan password harus diisi!');
      rl.close();
      return;
    }

    if (password.length < 6) {
      console.log('❌ Password minimal 6 karakter!');
      rl.close();
      return;
    }

    console.log('\n⏳ Membuat akun Super Admin...');

    // Create user account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: 'super_admin'
        }
      }
    });

    if (authError) {
      console.log('❌ Gagal membuat akun:', authError.message);
      rl.close();
      return;
    }

    console.log('✅ Akun berhasil dibuat!');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 User ID: ${authData.user?.id}`);

    // Wait a moment for user to be created
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Try to add role to user_roles table
    if (authData.user?.id) {
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: 'super_admin'
        });

      if (roleError) {
        console.log('⚠️  Warning: Gagal menambahkan role ke database:', roleError.message);
        console.log('Role akan ditambahkan saat user pertama kali login.');
      } else {
        console.log('✅ Role Super Admin berhasil ditambahkan!');
      }
    }

    console.log('\n🎉 Super Admin account berhasil dibuat!');
    console.log('📝 Catatan:');
    console.log('   - User mungkin perlu verifikasi email jika diaktifkan');
    console.log('   - Gunakan email dan password ini untuk login pertama kali');
    console.log('   - Pastikan schema database sudah dijalankan di Supabase');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

createSuperAdmin();