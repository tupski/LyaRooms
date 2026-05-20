import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { AlertCircle, Calendar, Inbox } from 'lucide-react';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import PaginationControls from '@/components/PaginationControls';
import usePaginatedQuery from '@/hooks/usePaginatedQuery';
import { formatRupiah } from '@/lib/formatRupiah';

const PAGE_SIZE = 10;
const LAINNYA_LABEL = 'Lainnya';

/**
 * CategoryDetailPopup
 *
 * Dialog that lists expenses for a specific category, paginated server-side.
 * Closing the popup does not mutate any parent state — all paging/filter
 * state lives inside the dialog's own usePaginatedQuery instance and is
 * unmounted when `open` becomes false (Radix Dialog unmounts content).
 *
 * Props:
 *   open          : boolean - controlled open state
 *   onOpenChange  : (open: boolean) => void - controlled change handler
 *   category      : string  - category name (use "Lainnya" for null/empty)
 *   totalAmount   : number  - total amount across all pages, displayed in header
 *   filters       : { lokasi?, kamar?, startDate?, endDate? } - parent filters
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
 */
const CategoryDetailPopup = ({
    open,
    onOpenChange,
    category,
    label,
    totalAmount = 0,
    filters = {},
}) => {
    const { lokasi, kamar, startDate, endDate } = filters || {};
    // category is the raw DB value (may be null for "Lainnya")
    // label is the display name
    const isLainnya = category === 'Lainnya' || category === null || category === undefined || String(category).trim() === '';
    const displayLabel = label || (isLainnya ? 'Lainnya' : category) || 'Lainnya';

    // Build filter object compatible with usePaginatedQuery's filter API
    // (Requirement 6.2 - filter by selected category + active filters)
    const popupFilters = useMemo(() => {
        const next = {};
        if (lokasi) next.apartment_location = { op: 'eq', value: lokasi };
        if (kamar) next.room_number = { op: 'eq', value: kamar };
        if (startDate) {
            next.tanggal_from = { op: 'gte', value: startDate, column: 'tanggal' };
        }
        if (endDate) {
            next.tanggal_to = { op: 'lte', value: endDate, column: 'tanggal' };
        }
        if (isLainnya) {
            // null/empty category rows
            next.category = { op: 'is', value: null };
        } else if (category !== undefined && category !== null) {
            next.category = { op: 'eq', value: category };
        }
        return next;
    }, [lokasi, kamar, startDate, endDate, category, isLainnya]);

    const {
        data: expenses,
        totalItems,
        totalPages,
        currentPage,
        pageSize,
        isLoading,
        error,
        setPage,
        setPageSize,
    } = usePaginatedQuery({
        table: 'pengeluaran',
        select: '*',
        pageSize: PAGE_SIZE,
        orderBy: 'tanggal',
        ascending: false,
        filters: popupFilters,
        // Skip fetching while dialog is closed to avoid unnecessary network
        enabled: Boolean(open && (category !== undefined)),
    });

    const formatTanggal = (value) => {
        if (!value) return '-';
        try {
            return format(new Date(value), 'dd MMMM yyyy', { locale: idLocale });
        } catch {
            return String(value);
        }
    };

    const headerLabel = displayLabel;
    const showEmpty =
        !isLoading && !error && (!expenses || expenses.length === 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-white w-[calc(100vw-2rem)] max-w-lg overflow-hidden">
                <DialogHeader>
                    <DialogTitle className="pr-6 leading-snug break-words">
                        {headerLabel}
                    </DialogTitle>
                    <DialogDescription className="flex items-center justify-between text-sm gap-2">
                        <span className="text-gray-600 min-w-0">
                            Total{' '}
                            <span className="font-semibold text-red-600">
                                {formatRupiah(totalAmount)}
                            </span>
                        </span>
                        {totalItems > 0 && (
                            <span className="text-xs text-gray-500 shrink-0">
                                {totalItems} transaksi
                            </span>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                    {/* Error state (Requirement 6.7) */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>Gagal memuat detail kategori.</span>
                        </div>
                    )}

                    {/* Loading state */}
                    {isLoading && (!expenses || expenses.length === 0) && (
                        <div className="flex justify-center py-8">
                            <Spinner className="w-6 h-6 text-blue-500" />
                        </div>
                    )}

                    {/* Empty state (Requirement 6.8) */}
                    {showEmpty && (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                            <Inbox className="w-10 h-10 text-gray-300 mb-2" />
                            <p className="text-sm text-gray-500">
                                Tidak ada pengeluaran untuk kategori ini
                            </p>
                        </div>
                    )}

                    {/* Detail list (Requirement 6.3) */}
                    {expenses && expenses.length > 0 && (
                        <ul className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
                            {expenses.map((expense) => (
                                <li
                                    key={expense.id}
                                    className="bg-white/70 border rounded-xl p-3 shadow-sm"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="font-semibold text-gray-900 break-words">
                                            {expense.nama_pengeluaran || '-'}
                                        </p>
                                        <p className="font-bold text-red-600 whitespace-nowrap">
                                            {formatRupiah(expense.jumlah)}
                                        </p>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 flex items-center">
                                        <Calendar className="w-3 h-3 mr-1" />
                                        {formatTanggal(expense.tanggal)}
                                    </p>
                                    {expense.keterangan && (
                                        <p className="text-sm text-gray-700 mt-2 border-t pt-2 break-words">
                                            {expense.keterangan}
                                        </p>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}

                    {/* Pagination (Requirement 6.4) */}
                    {totalItems > pageSize && (
                        <PaginationControls
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setPage}
                            itemsPerPage={pageSize}
                            totalItems={totalItems}
                            onPageSizeChange={setPageSize}
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default CategoryDetailPopup;
