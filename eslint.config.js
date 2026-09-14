import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * ESLint flat config (ESLint 10).
 * eslint-config-prettier đặt CUỐI để tắt mọi rule format xung đột với Prettier —
 * ESLint lo chất lượng code, Prettier lo định dạng, không chồng lấn.
 */
export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules'] },

  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,

  // Dùng nhánh `flat` — `configs['recommended-latest']` ở top level vẫn là kiểu eslintrc
  // (plugins là mảng string) nên ESLint 10 từ chối.
  reactHooks.configs.flat.recommended,
  reactRefresh.configs.vite,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Dữ liệu tĩnh truy cập bằng index/key có thể trả undefined — dùng `!` có chủ đích
      // ở data đã biết chắc, nên tắt rule này thay vì rải optional chaining vô nghĩa.
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  {
    // File test: nới vài rule không đáng áp cho fixture
    files: ['**/*.test.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },

  {
    // File config chạy bằng Node, không thuộc tsconfig của src
    files: ['*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
    extends: [tseslint.configs.disableTypeChecked],
  },

  prettierConfig,
);
