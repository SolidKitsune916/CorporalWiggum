import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        duration: 4000,
        classNames: {
          toast: 'bg-background border-border',
          title: 'text-foreground',
          description: 'text-muted-foreground',
          success: 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800',
          error: 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800',
          info: 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800',
        },
      }}
      closeButton
      richColors
    />
  );
}
