/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_JSONBIN_API_KEY?: string;
  readonly VITE_JSONBIN_BIN_ID?: string;
  readonly VITE_APPWRITE_ENDPOINT?: string;
  readonly VITE_APPWRITE_PROJECT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
