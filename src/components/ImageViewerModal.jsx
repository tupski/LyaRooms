import React, { useCallback, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  Download,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const MIN_SCALE = 0.35;
const MAX_SCALE = 3;
const SCALE_STEP = 0.25;

/**
 * Pratinjau gambar layar penuh: putar, zoom, unduh. Tombol tutup kontras di atas latar gelap.
 * @param {{ open: boolean; onOpenChange: (v: boolean) => void; items: { src: string; title?: string; downloadName?: string }[] }} props
 */
const ImageViewerModal = ({ open, onOpenChange, items = [] }) => {
  const [index, setIndex] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [scale, setScale] = useState(1);

  const list = Array.isArray(items) ? items.filter((x) => x?.src) : [];
  const current = list[index] || null;

  useEffect(() => {
    if (open) {
      setIndex(0);
      setRotation(0);
      setScale(1);
    }
  }, [open, items]);

  const bumpIndex = useCallback(
    (delta) => {
      if (list.length <= 1) return;
      setIndex((i) => (i + delta + list.length) % list.length);
      setRotation(0);
      setScale(1);
    },
    [list.length]
  );

  const handleDownload = async () => {
    if (!current?.src) return;
    const name = current.downloadName || current.title || 'gambar.jpg';
    try {
      const res = await fetch(current.src);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') ? name : `${name}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(current.src, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        className="max-h-[92vh] max-w-[min(96vw,900px)] gap-0 overflow-hidden border-slate-700 bg-zinc-950 p-0 text-white"
      >
        <div className="flex items-center justify-between gap-2 border-b border-zinc-800 px-3 py-2 pr-2">
          <DialogHeader className="flex-1 space-y-0 text-left">
            <DialogTitle className="text-base text-white">{current?.title || 'Pratinjau gambar'}</DialogTitle>
            {list.length > 1 && (
              <DialogDescription className="text-xs text-zinc-400">
                {index + 1} / {list.length}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="flex flex-wrap items-center justify-end gap-1">
            {list.length > 1 && (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-9 w-9 shrink-0 border border-zinc-600 bg-zinc-800 text-white hover:bg-zinc-700"
                  onClick={() => bumpIndex(-1)}
                  aria-label="Gambar sebelumnya"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-9 w-9 shrink-0 border border-zinc-600 bg-zinc-800 text-white hover:bg-zinc-700"
                  onClick={() => bumpIndex(1)}
                  aria-label="Gambar berikutnya"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-9 w-9 shrink-0 border border-zinc-600 bg-zinc-800 text-white hover:bg-zinc-700"
              onClick={() => setRotation((r) => r - 90)}
              aria-label="Putar ke kiri"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-9 w-9 shrink-0 border border-zinc-600 bg-zinc-800 text-white hover:bg-zinc-700"
              onClick={() => setRotation((r) => r + 90)}
              aria-label="Putar ke kanan"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-9 w-9 shrink-0 border border-zinc-600 bg-zinc-800 text-white hover:bg-zinc-700"
              onClick={() => setScale((s) => Math.max(MIN_SCALE, s - SCALE_STEP))}
              aria-label="Perkecil"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-9 w-9 shrink-0 border border-zinc-600 bg-zinc-800 text-white hover:bg-zinc-700"
              onClick={() => setScale((s) => Math.min(MAX_SCALE, s + SCALE_STEP))}
              aria-label="Perbesar"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-9 w-9 shrink-0 border border-zinc-600 bg-zinc-800 text-white hover:bg-zinc-700"
              onClick={handleDownload}
              aria-label="Unduh gambar"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-9 w-9 shrink-0 border-2 border-white/80 bg-zinc-900 text-white shadow-md hover:bg-zinc-800"
              onClick={() => onOpenChange(false)}
              aria-label="Tutup"
            >
              <X className="h-5 w-5" strokeWidth={2.5} />
            </Button>
          </div>
        </div>

        <div className="flex max-h-[calc(92vh-4rem)] min-h-[200px] items-center justify-center overflow-auto bg-black p-2">
          {current?.src && (
            <img
              src={current.src}
              alt={current.title || ''}
              className="max-h-[65vh] w-auto max-w-full object-contain transition-transform duration-200 ease-out"
              style={{
                transform: `rotate(${rotation}deg) scale(${scale})`,
                transformOrigin: 'center center',
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageViewerModal;
