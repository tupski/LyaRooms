export function formatRupiahNumber(value) {
  return `Rp ${new Intl.NumberFormat('id-ID').format(Number(value || 0))}`;
}

/**
 * Format pembayaran untuk teks WhatsApp (tunai/transfer/split).
 * - Jika transfer 0 => tampil "Tunai/Cash"
 * - Jika split => tampil 2 baris, dan transfer menampilkan tujuan jika ada
 */
export function formatPaymentLines({ cashAmount = 0, transferAmount = 0, transferTo = null } = {}) {
  const cash = Number(cashAmount || 0);
  const transfer = Number(transferAmount || 0);
  const total = cash + transfer;

  const lines = [];
  if (transfer <= 0 && cash > 0) {
    lines.push(`Tunai/Cash ${formatRupiahNumber(cash)}`);
    return { total, lines };
  }

  if (cash <= 0 && transfer > 0) {
    lines.push(`Transfer ${formatRupiahNumber(transfer)}${transferTo ? ` (ke ${transferTo})` : ''}`);
    return { total, lines };
  }

  lines.push(`Split Payment:`);
  lines.push(`- Tunai/Cash: ${formatRupiahNumber(cash)}`);
  lines.push(`- Transfer: ${formatRupiahNumber(transfer)}${transferTo ? ` (ke ${transferTo})` : ''}`);
  return { total, lines };
}

