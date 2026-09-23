export type SocialLink = {
  id: string;
  label: string;
  href: string;
  /** Path của icon trong viewBox 24x24 */
  iconPath: string;
};

/**
 * Cùng cách làm với PAGE_ITEMS: chrome của app, thêm mạng xã hội mới là thêm ở đây.
 * Để ở lib vì hai nơi dùng chung — chân trang (khổ rộng) và ngăn kéo menu (điện thoại,
 * nơi chân trang bị ẩn).
 */
export const SOCIAL_LINKS: SocialLink[] = [
  {
    id: 'facebook',
    label: 'Facebook',
    href: 'https://www.facebook.com/h2tcobra3dhue',
    iconPath:
      'M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.92 3.77-3.92 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.9h2.78l-.45 2.91h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94Z',
  },
];
