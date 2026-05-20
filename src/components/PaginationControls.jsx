import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

/**
 * PaginationControls
 *
 * Tampilan:
 *   Menampilkan [10 ▾] data dari X data.   Halaman: < [1 ▾] >
 *
 * Props:
 *   currentPage      : number   - halaman aktif (1-based)
 *   totalPages       : number   - total halaman
 *   onPageChange     : (page: number) => void
 *   itemsPerPage     : number   - jumlah item per halaman (untuk label)
 *   totalItems       : number   - total item keseluruhan
 *   onPageSizeChange : (size: number) => void  - opsional, jika tidak diberikan dropdown pageSize disembunyikan
 */
const PaginationControls = ({
    currentPage,
    totalPages,
    onPageChange,
    itemsPerPage = 10,
    totalItems = 0,
    onPageSizeChange,
}) => {
    if (totalItems === 0) return null;

    const pageOptions = Array.from({ length: totalPages }, (_, i) => i + 1);

    return (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 bg-white/50 rounded-xl border text-sm text-gray-600">
            {/* Kiri: jumlah data per halaman */}
            <div className="flex items-center gap-1.5 flex-wrap">
                <span>Menampilkan</span>
                {onPageSizeChange ? (
                    <select
                        value={itemsPerPage}
                        onChange={(e) => {
                            onPageSizeChange(Number(e.target.value));
                            onPageChange(1);
                        }}
                        className="border border-gray-300 rounded-lg px-2 py-1 text-sm bg-white text-gray-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                        {PAGE_SIZE_OPTIONS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                ) : (
                    <span className="font-semibold">{itemsPerPage}</span>
                )}
                <span>data dari <span className="font-semibold">{totalItems}</span> data.</span>
            </div>

            {/* Kanan: navigasi halaman */}
            <div className="flex items-center gap-1.5">
                <span>Halaman:</span>
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="h-7 w-7 flex items-center justify-center rounded-lg border border-gray-300 bg-white disabled:opacity-40 hover:bg-gray-50 transition-colors"
                    aria-label="Halaman sebelumnya"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <select
                    value={currentPage}
                    onChange={(e) => onPageChange(Number(e.target.value))}
                    className="border border-gray-300 rounded-lg px-2 py-1 text-sm bg-white text-gray-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400"
                    aria-label="Pilih halaman"
                >
                    {pageOptions.map((p) => (
                        <option key={p} value={p}>{p}</option>
                    ))}
                </select>
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="h-7 w-7 flex items-center justify-center rounded-lg border border-gray-300 bg-white disabled:opacity-40 hover:bg-gray-50 transition-colors"
                    aria-label="Halaman berikutnya"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default PaginationControls;
