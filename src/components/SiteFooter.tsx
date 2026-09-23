import { SOCIAL_LINKS } from '../lib/socialLinks';
import styles from './SiteFooter.module.css';

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
