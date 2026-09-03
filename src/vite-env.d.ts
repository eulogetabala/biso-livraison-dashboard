/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_MODE?: 'auto' | 'local' | 'prod';
  readonly VITE_API_URL?: string;
  readonly VITE_API_LOCAL_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
