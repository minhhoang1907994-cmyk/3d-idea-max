/// <reference types="vite/client" />

/**
 * File System Access API chưa có trong lib DOM mặc định của TypeScript.
 * Chỉ khai báo phần app thực sự dùng, không khai báo thừa.
 * Spec: https://developer.mozilla.org/en-US/docs/Web/API/Window/showDirectoryPicker
 */
interface Window {
  showDirectoryPicker(options?: {
    mode?: 'read' | 'readwrite';
    id?: string;
    startIn?: string;
  }): Promise<FileSystemDirectoryHandle>;
}

interface FileSystemDirectoryHandle {
  requestPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
}

/**
 * Translator API (Chrome built-in AI) — chưa có trong lib DOM của TypeScript.
 * Chỉ khai báo phần app dùng.
 * Spec: https://developer.mozilla.org/en-US/docs/Web/API/Translator
 */
interface TranslatorCreateMonitor extends EventTarget {
  addEventListener(type: 'downloadprogress', listener: (event: { loaded: number }) => void): void;
}

interface TranslatorInstance {
  translate(input: string): Promise<string>;
  destroy(): void;
}

declare const Translator: {
  availability(options: {
    sourceLanguage: string;
    targetLanguage: string;
  }): Promise<'available' | 'downloadable' | 'downloading' | 'unavailable'>;
  create(options: {
    sourceLanguage: string;
    targetLanguage: string;
    monitor?: (monitor: TranslatorCreateMonitor) => void;
    signal?: AbortSignal;
  }): Promise<TranslatorInstance>;
};
