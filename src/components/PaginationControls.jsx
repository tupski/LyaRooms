import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PaginationControls = ({ 
    currentPage, 
    totalPages, 
    onPageChange,
    itemsPerPage = 10,
    totalItems = 0
}) => {
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-between px-4 py-3 bg-white/50 rounded-xl border">
            <div className="text-sm text-gray-600">
                Menampilkan <span className="font-semibold">{startItem}</span> - <span className="font-semibold">{endItem}</span> dari <span className="font-semibold">{totalItems}</span> data
            </div>
            <div className="flex items-center gap-2">
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="h-8 w-8 p-0"
                >
                    <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                        // Show first page, last page, current page, and pages around current
                        if (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                        ) {
                            return (
                                <Button
                                    key={page}
                                    size="sm"
                                    variant={page === currentPage ? "default" : "outline"}
                                    onClick={() => onPageChange(page)}
                                    className={`h-8 w-8 p-0 ${page === currentPage ? 'bg-blue-500 text-white' : ''}`}
                                >
                                    {page}
                                </Button>
                            );
                        } else if (
                            page === currentPage - 2 ||
                            page === currentPage + 2
                        ) {
                            return <span key={page} className="px-1 text-gray-400">...</span>;
                        }
                        return null;
                    })}
                </div>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 p-0"
                >
                    <ChevronRight className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
};

export default PaginationControls;