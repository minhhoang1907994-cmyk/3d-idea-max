import { useState } from 'react';
import styles from './App.module.css';
import { SideMenu, type PageId } from './components/SideMenu';
import { useCompanyLedger } from './hooks/useCompanyLedger';
import { useIdeaData } from './hooks/useIdeaData';
import { CompanyLedgerPage } from './pages/CompanyLedgerPage';
import { DataManagerPage } from './pages/DataManagerPage';
import { ImageAnalyzePage } from './pages/ImageAnalyzePage';
import { MixPage } from './pages/MixPage';
import { SlicerConvertPage } from './pages/SlicerConvertPage';

export default function App() {
  const [page, setPage] = useState<PageId>('mix');
  // Một nguồn dữ liệu dùng chung cho cả 2 trang: sửa bên Quản lý thì Mix thấy ngay
  const dataStore = useIdeaData();
  // Giữ ở App chứ không trong trang: chuyển tab rồi quay lại vẫn còn phần chưa lưu
  const ledger = useCompanyLedger();

  const dirtyPages: PageId[] = [];
  if (dataStore.status.dirty) dirtyPages.push('data');
  if (ledger.status.dirty) dirtyPages.push('company');

  return (
    <div className={styles.shell}>
      <SideMenu current={page} onNavigate={setPage} dirtyPages={dirtyPages} />
      <div className={styles.main}>
        {page === 'mix' ? <MixPage data={dataStore.data} /> : null}
        {page === 'image' ? <ImageAnalyzePage /> : null}
        {page === 'convert' ? <SlicerConvertPage /> : null}
        {page === 'data' ? <DataManagerPage dataStore={dataStore} /> : null}
        {page === 'company' ? <CompanyLedgerPage ledger={ledger} /> : null}
      </div>
    </div>
  );
}
