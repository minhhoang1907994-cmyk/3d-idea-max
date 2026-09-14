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
