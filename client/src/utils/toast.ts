// This is a wrapper file for react-toastify to fix TypeScript issues
import ReactToastify from 'react-toastify';

// Re-export the toast object
export const toast = {
  success: (message: string) => {
    if (ReactToastify.toast) {
      ReactToastify.toast.success(message);
    } else {
      console.log('Toast success:', message);
    }
  },
  error: (message: string) => {
    if (ReactToastify.toast) {
      ReactToastify.toast.error(message);
    } else {
      console.error('Toast error:', message);
    }
  },
  info: (message: string) => {
    if (ReactToastify.toast) {
      ReactToastify.toast.info(message);
    } else {
      console.info('Toast info:', message);
    }
  },
  warn: (message: string) => {
    if (ReactToastify.toast) {
      ReactToastify.toast.warn(message);
    } else {
      console.warn('Toast warn:', message);
    }
  }
};

// Re-export the ToastContainer component
export const ToastContainer = ReactToastify.ToastContainer || (() => null); 