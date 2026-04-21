/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_RESPONSES_SHEET_ID: string;
  readonly VITE_BACKEND_SHEET_ID: string;
  readonly VITE_DOMAIN_ALLOWLIST: string;
  readonly VITE_APP_TITLE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Google Identity Services types
interface Window {
  google: {
    accounts: {
      id: {
        initialize: (config: Record<string, unknown>) => void;
        prompt: (cb?: (notification: { isNotDisplayed: () => boolean }) => void) => void;
        disableAutoSelect: () => void;
        renderButton: (el: HTMLElement, config: Record<string, unknown>) => void;
      };
      oauth2: {
        initTokenClient: (config: Record<string, unknown>) => {
          requestAccessToken: (config?: Record<string, unknown>) => void;
        };
      };
    };
  };
}
