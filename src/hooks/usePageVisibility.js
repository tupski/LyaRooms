import { useEffect } from 'react';

/**
 * Hook untuk mencegah reload/refresh saat tab disembunyikan dan ditampilkan kembali.
 * Menonaktifkan service worker reactivation pada visibility change.
 */
export const useDisableAutoReload = () => {
  useEffect(() => {
    // Flag untuk tracking visibility state
    let wasHidden = false;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        wasHidden = true;
      } else if (wasHidden) {
        // Page kembali terlihat - prevent automatic reload
        wasHidden = false;

        // Disable service worker refresh
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then((registrations) => {
            registrations.forEach((registration) => {
              // Skip update check
              registration.onupdatefound = null;
            });
          });
        }

        // Prevent page reload by stopping any pending reload timers
        if (window.pendingReloadTimer) {
          clearTimeout(window.pendingReloadTimer);
          window.pendingReloadTimer = null;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', (event) => {
      // Jika page restore dari back-forward cache, jangan reload
      if (event.persisted) {
        wasHidden = false;
      }
    });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
};
