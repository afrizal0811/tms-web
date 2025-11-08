import { toast } from 'react-hot-toast';

// Fungsi kustom untuk warning
export const toastWarning = (message) => {
  toast(message, {
    icon: '⚠️',
    className: 'my-toast-warning', // Gunakan className agar rapi
  });
};

// Anda juga bisa buat untuk error di sini agar konsisten
export const toastError = (message) => {
  toast.error(message, {
    className: 'my-toast-error',
  });
};

export const toastSuccess = (message) => {
  toast.success(message, {
    className: 'my-toast-success',
  });
};
