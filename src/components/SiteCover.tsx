import styles from './SiteCover.module.css';

/**
 * Ảnh bìa thương hiệu, nằm ngay dưới SiteHeader và hiện ở mọi trang.
 *
 * Ảnh gốc 1919×820 nền xanh đậm nên khung bao cũng lấy đúng màu đó: khổ rộng thì
 * hai mép ảnh hoà vào nền, không thấy đường cắt. Không đặt `loading="lazy"`: đây là
 * ảnh đầu trang, hoãn tải chỉ đổi lấy một khoảng trống lúc mở web.
 */
export function SiteCover() {
  return (
    <div className={styles.cover}>
      <img
        className={styles.image}
        src="/cover.png"
        alt="H2T Cobra 3D Printing Solutions — in 3D theo yêu cầu, mô hình, decor, phụ kiện; thiết kế và sản xuất tại Huế, nhận đơn toàn quốc"
        width={1919}
        height={820}
      />
    </div>
  );
}
