import styles from './SiteFooter.module.css';

type SocialLink = {
  id: string;
  label: string;
  href: string;
  /** Path của icon trong viewBox 24x24 */
  iconPath: string;
};

// Cùng cách làm với PAGE_ITEMS: chrome của app, thêm mạng xã hội mới là thêm ở đây
const SOCIAL_LINKS: SocialLink[] = [
  {
    id: 'facebook',
    label: 'Facebook',
    href: 'https://www.facebook.com/h2tcobra3dhue',
    iconPath:
      'M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.92 3.77-3.92 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.9h2.78l-.45 2.91h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94Z',
  },
];

/** Chân trang dùng chung cho mọi trang — nằm ở App, không lặp lại trong từng page */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <img className={styles.logo} src="/logo.png" alt="H2T Cobra" width={432} height={483} />
          <div className={styles.brandText}>
            <span className={styles.brandName}>H2T Cobra 3D</span>
            <span className={styles.brandNote}>Ý tưởng &amp; thông số in 3D cho cả nhóm</span>
          </div>
        </div>

        <nav className={styles.social} aria-label="Mạng xã hội">
          {SOCIAL_LINKS.map((link) => (
            <a
              key={link.id}
              className={styles.socialLink}
              href={link.href}
              target="_blank"
              rel="noreferrer noopener"
              title={link.label}
              aria-label={link.label}
            >
              <svg className={styles.socialIcon} viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d={link.iconPath} />
              </svg>
              <span className={styles.socialLabel}>{link.label}</span>
            </a>
          ))}
        </nav>
      </div>

      <p className={styles.copyright}>© {year} H2T Cobra 3D Printing Solutions</p>
    </footer>
  );
}
