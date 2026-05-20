import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Image as ImageIcon, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { resolveStorageUrl } from '@/lib/storageUrl';
import { formatPaymentLines, formatRupiahNumber } from '@/lib/formatPaymentText';
import ImageViewerModal from '@/components/ImageViewerModal';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import FormTransaksiModern from '@/components/FormTransaksiModern';
import DayInfoBanner from '@/components/DayInfoBanner';

/**
 * KaryawanTransaksi – halaman container untuk karyawan.
 * - Form input transaksi menggunakan FormTransaksiModern (role karyawan).
 * - Panel riwayat, laporan WhatsApp, dan preview berkas tetap dikelola di sini.
 */
const KaryawanTransaksi = ({ onRequestNavigate }) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewTransaksi, setPreviewTransaksi] = useState(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [reportTransaksi, setReportTransaksi] = useState(null);
  const [confirmResendTransaksi, setConfirmResendTransaksi] = useState(null);
  const [reportDraft, setReportDraft] = useState(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // --- Utilitas laporan WhatsApp ---
  const getSentMap = () => {
    try {
      return JSON.parse(localStorage.getItem('kr_report_sent_map') || '{}');
    } catch (_e) {
      return {};
    }
  };
  const markSent = (id) => {
    const map = getSentMap();
    map[id] = new Date().toISOString();
    localStorage.setItem('kr_report_sent_map', JSON.stringify(map));
  };

  const formatReportDateTime = (iso) => {
    const parts = new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date(iso));
    const getPart = (type) => parts.find((part) => part.type === type)?.value || '';
    return `${getPart('day')} ${getPart('month')} ${getPart('year')}, ${getPart('hour')}:${getPart('minute')} WIB`;
  };

  const inferCheckoutTime = (transaksi) => {
    if (transaksi.checkout_at) return transaksi.checkout_at;
    const checkInDate = new Date(transaksi.checkin_at || transaksi.created_at);
    const checkoutDate = new Date(checkInDate.getTime() + (Number(transaksi.rental_duration) || 1) * 60 * 60 * 1000);
    return checkoutDate.toISOString();
  };

  const formatRentalDuration = (hours) => {
    if (!hours) return '1 JAM';
    const map = { 3: '3 JAM', 6: '6 JAM', 9: '9 JAM', 12: '12 JAM', 24: '24 JAM' };
    return map[hours] || `${hours} JAM`;
  };

  const buildForwardMessage = (t) => {
    const { total, lines } = formatPaymentLines({
      cashAmount: t.cash_amount || 0,
      transferAmount: t.transfer_amount || 0,
      transferTo: t.transfer_to || null,
    });
    const komisi = formatRupiahNumber(Number(t.marketing_fee || 0));
    const depositCash = Number(t.deposit_cash || 0);
    const depositTransfer = Number(t.deposit_transfer || 0);
    const depositLine = depositCash > 0 || depositTransfer > 0
      ? `Deposit: ${depositCash > 0 ? `Tunai ${formatRupiahNumber(depositCash)} ` : ''}${depositTransfer > 0 ? `Transfer ${formatRupiahNumber(depositTransfer)}` : ''}`.trim()
      : null;
    return `*LAPORAN TRANSAKSI*\n\nCustomer: ${t.customer_name}\nLokasi: ${t.apartment_location} - ${t.room_number}\nMarketing: ${t.marketing_name || '-'}\nKomisi: ${komisi}\nSewa: ${formatRentalDuration(t.rental_duration)} (${t.shift || '-'})\nCheck-in: ${formatReportDateTime(t.checkin_at || t.created_at)}\nCheckout: ${formatReportDateTime(inferCheckoutTime(t))}\nTotal Bayar: ${formatRupiahNumber(total)}\nPembayaran: ${lines.join('\n')}${depositLine ? `\n${depositLine}` : ''}\nInput oleh: ${t.input_by || '-'}`;
  };

  const sendForwardReport = (t, force = false) => {
    const sentAt = getSentMap()[t.id];
    if (sentAt && !force) {
      setConfirmResendTransaksi(t);
      return;
    }
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(buildForwardMessage(t))}`, '_blank');
    markSent(t.id);
  };

  const openReportModal = (t) => {
    setReportDraft({
      customer_name: t.customer_name || '',
      apartment_location: t.apartment_location || '',
      room_number: t.room_number || '',
      marketing_name: t.marketing_name || '',
      rental_duration: formatRentalDuration(t.rental_duration),
      shift: t.shift || '',
      cash_amount: String(t.cash_amount || 0),
      transfer_amount: String(t.transfer_amount || 0),
      transfer_to: t.transfer_to || '',
      marketing_fee: String(t.marketing_fee || 0),
      deposit_cash: String(t.deposit_cash || 0),
      deposit_transfer: String(t.deposit_transfer || 0),
      input_by: t.input_by || user?.email || '',
      alasan: '',
    });
    setReportTransaksi(t);
  };

  const sendIssueReport = () => {
    if (!reportTransaksi || !reportDraft) return;
    const { total, lines } = formatPaymentLines({
      cashAmount: Number(reportDraft.cash_amount || 0),
      transferAmount: Number(reportDraft.transfer_amount || 0),
      transferTo: reportDraft.transfer_to || null,
    });
    const msg = `*LAPOR KESALAHAN TRANSAKSI*\n\nAlasan: ${reportDraft.alasan || '-'}\n\nCustomer: ${reportDraft.customer_name}\nLokasi: ${reportDraft.apartment_location}\nKamar: ${reportDraft.room_number}\nMarketing: ${reportDraft.marketing_name || '-'}\nDurasi Sewa: ${reportDraft.rental_duration}\nShift: ${reportDraft.shift || '-'}\nTotal Bayar: ${formatRupiahNumber(total)}\n${lines.join('\n')}\nFee Marketing: ${formatRupiahNumber(Number(reportDraft.marketing_fee || 0))}\nDeposit: ${Number(reportDraft.deposit_cash || 0) > 0 ? `Tunai ${formatRupiahNumber(Number(reportDraft.deposit_cash || 0))} ` : ''}${Number(reportDraft.deposit_transfer || 0) > 0 ? `Transfer ${formatRupiahNumber(Number(reportDraft.deposit_transfer || 0))}` : 'Tidak ada'}\nInput oleh: ${reportDraft.input_by || '-'}\nID Transaksi: ${reportTransaksi.id}`;
    window.open(`https://wa.me/6289613413636?text=${encodeURIComponent(msg)}`, '_blank');
    setReportTransaksi(null);
  };

  // --- Data transaksi ---
  const loadTransactions = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('transactions')
      .select('id, customer_name, apartment_location, room_number, marketing_name, rental_duration, shift, created_at, checkin_at, checkout_at, input_by, cash_amount, transfer_amount, transfer_to, marketing_fee, deposit_cash, deposit_transfer, ktp_image_url, transfer_proof_url')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) toast({ title: 'Gagal memuat transaksi', description: error.message, variant: 'destructive' });
    else setTransactions(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Pagination logic
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return transactions.slice(startIndex, endIndex);
  }, [transactions, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(transactions.length / itemsPerPage);

  const previewViewerItems = useMemo(() => {
    if (!previewTransaksi) return [];
    const list = [];
    if (previewTransaksi.ktp_image_url) {
      list.push({ src: resolveStorageUrl(previewTransaksi.ktp_image_url), title: 'KTP', downloadName: `ktp-${previewTransaksi.id}.jpg` });
    }
    if (previewTransaksi.transfer_proof_url) {
      list.push({ src: resolveStorageUrl(previewTransaksi.transfer_proof_url), title: 'Bukti transfer', downloadName: `bukti-${previewTransaksi.id}.jpg` });
    }
    return list;
  }, [previewTransaksi]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-indigo-100 px-3 py-6 pb-28 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-600 to-cyan-500 p-5 text-white shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Input Data Check-in</h1>
              <p className="text-sm text-blue-100">Catat transaksi dan pantau riwayat input Anda.</p>
            </div>
            <div className="rounded-xl bg-white/20 px-4 py-2 text-sm text-white">
              <div className="font-medium">{user?.user_metadata?.full_name || user?.email}</div>
              <div className="text-xs uppercase tracking-wide text-blue-100">Karyawan</div>
            </div>
          </div>
        </header>

        <DayInfoBanner />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
          {/* Kolom Form */}
          <div className="lg:col-span-7">
            <FormTransaksiModern
              roleMode="karyawan"
              requireMarketing={true}
              allowReferenceManagement={false}
              defaultInputBy={user?.user_metadata?.full_name || user?.email || ''}
              onSuccess={loadTransactions}
              embedded={true}
            />
          </div>

          {/* Kolom Riwayat */}
          <div className="lg:col-span-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Riwayat Transaksi</h2>
                <span className="text-xs text-slate-400">{transactions.length} total</span>
              </div>
          {loading ? (
            <p className="text-sm text-slate-500">Memuat transaksi...</p>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada transaksi yang Anda input.</p>
          ) : (
            <>
            <div className="space-y-4">
              {paginatedTransactions.map((t) => {
                const sentAt = getSentMap()[t.id];
                return (
                  <motion.div key={t.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border bg-white/70 p-4">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <h3 className="font-bold text-gray-800">{t.customer_name}</h3>
                      <p className="text-right text-base font-extrabold text-orange-600">
                        Rp {new Intl.NumberFormat('id-ID').format((t.cash_amount || 0) + (t.transfer_amount || 0))}
                      </p>
                    </div>
                    <div className="mb-3 space-y-1 border-y py-2 text-xs text-gray-700">
                      <p>Lokasi: {t.apartment_location} - Kamar {t.room_number}</p>
                      <p>Sewa: {formatRentalDuration(t.rental_duration)} ({t.shift || '-'})</p>
                      <p>Check-in: {formatReportDateTime(t.checkin_at || t.created_at)}</p>
                      <p>Checkout: {formatReportDateTime(inferCheckoutTime(t))}</p>
                      <p>Marketing: {t.marketing_name || '-'}</p>
                      <p>Diinput oleh: {t.input_by || '-'}</p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        title="Lihat berkas"
                        onClick={() => {
                          if (!t.ktp_image_url && !t.transfer_proof_url) {
                            toast({ title: 'Tidak ada berkas', description: 'Belum ada KTP atau bukti transfer untuk transaksi ini.' });
                            return;
                          }
                          setPreviewTransaksi(t);
                          setViewerOpen(true);
                        }}
                      >
                        <ImageIcon className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => openReportModal(t)}>
                        <AlertTriangle className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        className={`h-8 w-8 ${sentAt ? 'bg-slate-500 hover:bg-slate-600' : 'bg-green-600 hover:bg-green-700'}`}
                        onClick={() => sendForwardReport(t)}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {transactions.length > 0 && (
              <div className="mt-4 rounded-2xl border bg-slate-50 p-3 shadow-sm">
                <div className="flex flex-col gap-3">
                  {/* Items per page dropdown */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-600 font-medium">Tampilkan:</span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                    <span className="text-xs text-slate-600">
                      <span className="font-bold text-slate-900">{transactions.length}</span> total
                    </span>
                  </div>

                  {/* Page navigation */}
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                        currentPage === 1
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm'
                      }`}
                    >
                      ← Prev
                    </button>

                    {/* Page numbers */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                              currentPage === pageNum
                                ? 'bg-blue-500 text-white shadow-sm'
                                : 'bg-white text-slate-600 hover:bg-slate-100 border'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                        currentPage === totalPages
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm'
                      }`}
                    >
                      Next →
                    </button>
                  </div>

                  {/* Current page info */}
                  <div className="text-center text-xs text-slate-600">
                    Halaman <span className="font-bold text-slate-900">{currentPage}</span> dari <span className="font-bold text-slate-900">{totalPages}</span>
                  </div>
                </div>
              </div>
            )}
            </>
          )}
            </div>
          </div>
        </div>
      </div>

      {/* Image viewer */}
      <ImageViewerModal
        open={viewerOpen && Boolean(previewTransaksi && previewViewerItems.length > 0)}
        onOpenChange={(open) => {
          setViewerOpen(open);
          if (!open) setPreviewTransaksi(null);
        }}
        items={previewViewerItems}
      />

      {/* Modal laporan kesalahan */}
      <Dialog open={Boolean(reportTransaksi)} onOpenChange={() => setReportTransaksi(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle>Laporkan Kesalahan</DialogTitle>
            <DialogDescription>Lengkapi data laporan sebelum kirim ke admin via WhatsApp.</DialogDescription>
          </DialogHeader>
          {reportDraft && (
            <div className="space-y-3">
              <input
                className="w-full rounded-xl border px-3 py-2 text-sm"
                value={reportDraft.alasan}
                onChange={(e) => setReportDraft((p) => ({ ...p, alasan: e.target.value }))}
                placeholder="Alasan"
              />
              {['customer_name', 'apartment_location', 'room_number', 'marketing_name', 'rental_duration', 'shift', 'cash_amount', 'transfer_amount', 'transfer_to', 'marketing_fee', 'deposit_cash', 'deposit_transfer', 'input_by'].map((field) => (
                <input
                  key={field}
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                  value={reportDraft[field] || ''}
                  onChange={(e) => setReportDraft((p) => ({ ...p, [field]: e.target.value }))}
                  placeholder={field}
                />
              ))}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setReportTransaksi(null)}>Batal</Button>
                <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={sendIssueReport}>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Kirim
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal konfirmasi kirim ulang */}
      <Dialog open={Boolean(confirmResendTransaksi)} onOpenChange={() => setConfirmResendTransaksi(null)}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Konfirmasi Lapor Ulang</DialogTitle>
            <DialogDescription>
              Customer ini sudah dilaporkan pada{' '}
              {confirmResendTransaksi ? new Date(getSentMap()[confirmResendTransaksi.id]).toLocaleString('id-ID') : '-'}.
              Apakah Anda yakin ingin laporkan ulang?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setConfirmResendTransaksi(null)}>Gak jadi</Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => {
                if (confirmResendTransaksi) sendForwardReport(confirmResendTransaksi, true);
                setConfirmResendTransaksi(null);
              }}
            >
              Ya, kirim aja
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KaryawanTransaksi;
