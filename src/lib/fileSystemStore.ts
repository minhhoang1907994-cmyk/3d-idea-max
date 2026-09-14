/**
 * Đọc/ghi trực tiếp file JSON trên đĩa qua File System Access API.
 * Nguồn: https://developer.mozilla.org/en-US/docs/Web/API/Window/showDirectoryPicker
 *
 * Trình duyệt hỗ trợ: Chrome / Edge. Safari KHÔNG hỗ trợ — gọi isFileSystemAccessSupported()
 * trước khi hiện nút kết nối, và dùng đường tải file về làm phương án thay thế.
 *
 * ⚠️ Ghi ở đây là ghi đè file thật trong repo. Commit trước khi dùng để còn rollback được.
 */

/** Handle thư mục đang kết nối — chỉ sống trong phiên, refresh phải chọn lại. */
let directoryHandle: FileSystemDirectoryHandle | null = null;

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

export function getConnectedDirectoryName(): string | null {
  return directoryHandle?.name ?? null;
}

export function isConnected(): boolean {
  return directoryHandle !== null;
}

export function disconnectDirectory(): void {
  directoryHandle = null;
}

/**
 * Mở hộp thoại chọn thư mục và xin quyền ghi.
 * Trả về tên thư mục đã kết nối, hoặc null nếu user bấm hủy.
 */
export async function connectDirectory(): Promise<string | null> {
  if (!isFileSystemAccessSupported()) {
    throw new Error(
      'Trình duyệt này không hỗ trợ ghi file trực tiếp. Dùng Chrome hoặc Edge, hoặc tải file JSON về rồi chép tay.',
    );
  }

  try {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    const permission = await handle.requestPermission({ mode: 'readwrite' });
    if (permission !== 'granted') {
      throw new Error('Bạn chưa cấp quyền ghi cho thư mục này.');
    }
    directoryHandle = handle;
    return handle.name;
  } catch (error) {
    // User bấm Cancel trong hộp thoại chọn thư mục — không phải lỗi thật
    if (error instanceof DOMException && error.name === 'AbortError') {
      return null;
    }
    throw error;
  }
}

function requireHandle(): FileSystemDirectoryHandle {
  if (!directoryHandle) {
    throw new Error('Chưa kết nối thư mục dữ liệu. Bấm "Kết nối thư mục data" trước.');
  }
  return directoryHandle;
}

export async function readJsonFile<T>(fileName: string): Promise<T> {
  const handle = await requireHandle().getFileHandle(fileName);
  const file = await handle.getFile();
  const text = await file.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`File ${fileName} không phải JSON hợp lệ — kiểm tra lại nội dung file.`);
  }
}

export async function writeJsonFile(fileName: string, data: unknown): Promise<void> {
  const handle = await requireHandle().getFileHandle(fileName, { create: true });
  const writable = await handle.createWritable();
  try {
    // Giữ nguyên định dạng 2 space + newline cuối như Prettier để git diff sạch
    await writable.write(JSON.stringify(data, null, 2) + '\n');
  } finally {
    await writable.close();
  }
}

/** Tải file JSON về máy — dùng khi trình duyệt không hỗ trợ ghi trực tiếp. */
export function downloadJsonFile(fileName: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
