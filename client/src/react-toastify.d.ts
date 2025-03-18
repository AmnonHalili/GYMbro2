declare module 'react-toastify' {
  import { ComponentType, ReactNode } from 'react';

  export const toast: {
    success(message: string, options?: any): void;
    error(message: string, options?: any): void;
    info(message: string, options?: any): void;
    warn(message: string, options?: any): void;
  };

  export interface ToastContainerProps {
    position?: 'top-right' | 'top-center' | 'top-left' | 'bottom-right' | 'bottom-center' | 'bottom-left';
    autoClose?: number | false;
    hideProgressBar?: boolean;
    newestOnTop?: boolean;
    closeOnClick?: boolean;
    rtl?: boolean;
    pauseOnFocusLoss?: boolean;
    draggable?: boolean;
    pauseOnHover?: boolean;
  }

  export const ToastContainer: ComponentType<ToastContainerProps>;
} 