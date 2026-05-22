import React from 'react';

/**
 * SectionCard — wrapper card dengan judul untuk setiap section analytics.
 * Styling konsisten dengan glassmorphic-card yang digunakan di seluruh proyek.
 */
export function SectionCard({ title, children }) {
  return (
    <div className="glassmorphic-card p-5 space-y-4">
      <h2 className="font-bold text-lg text-gray-800">{title}</h2>
      {children}
    </div>
  );
}

/**
 * SectionSkeleton — loading state per section menggunakan pola Tailwind animate-pulse.
 */
export function SectionSkeleton() {
  return (
    <div className="glassmorphic-card p-5 space-y-4 animate-pulse">
      {/* Judul placeholder */}
      <div className="h-5 w-40 rounded-lg bg-gray-200" />
      {/* Chart placeholder */}
      <div className="h-40 w-full rounded-xl bg-gray-200" />
      {/* Baris tabel placeholder */}
      <div className="space-y-2">
        <div className="h-4 w-full rounded bg-gray-200" />
        <div className="h-4 w-5/6 rounded bg-gray-200" />
        <div className="h-4 w-4/6 rounded bg-gray-200" />
      </div>
    </div>
  );
}

/**
 * SectionError — error state per section dengan border merah.
 * @param {string} name - Nama section yang mengalami error
 * @param {string} message - Pesan error teknis
 */
export function SectionError({ name, message }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600">
      <p className="font-semibold">{name}: Data tidak tersedia</p>
      <p className="mt-1 text-xs text-red-400">{message}</p>
    </div>
  );
}

/**
 * SectionEmpty — empty state per section dengan pesan yang dapat dikustomisasi.
 * @param {string} message - Pesan yang ditampilkan saat data kosong
 */
export function SectionEmpty({ message = 'Tidak ada data untuk periode ini.' }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
      <p>{message}</p>
    </div>
  );
}
