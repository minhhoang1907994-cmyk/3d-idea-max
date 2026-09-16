import { useState } from 'react';
import styles from './App.module.css';
import { SideMenu, type PageId } from './components/SideMenu';
import { useIdeaData } from './hooks/useIdeaData';
import { DataManagerPage } from './pages/DataManagerPage';
import { ImageAnalyzePage } from './pages/ImageAnalyzePage';
import { MixPage } from './pages/MixPage';
import { SlicerConvertPage } from './pages/SlicerConvertPage';

export default function App() {
  const [page, setPage] = useState<PageId>('mix');
  // Một nguồn dữ liệu dùng chung cho cả 2 trang: sửa bên Quản lý thì Mix thấy ngay
  const dataStore = useIdeaData();

  return (
    <div className={styles.shell}>
      <SideMenu current={page} onNavigate={setPage} dirty={dataStore.status.dirty} />
      <div className={styles.main}>
        {page === 'mix' ? <MixPage data={dataStore.data} /> : null}
        {page === 'image' ? <ImageAnalyzePage /> : null}
        {page === 'convert' ? <SlicerConvertPage /> : null}
        {page === 'data' ? <DataManagerPage dataStore={dataStore} /> : null}
      </div>
    </div>
  );
}
