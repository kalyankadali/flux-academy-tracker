/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_JSONBIN_API_KEY?: string;
  readonly VITE_JSONBIN_BIN_ID?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
