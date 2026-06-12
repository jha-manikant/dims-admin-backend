import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';

export default defineConfig(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'prisma/migrations/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          // Config files at the repo root aren't in any tsconfig — let the
          // project service fall back to a default project for them.
          // Glob pattern (not a literal path) so both CLI and IDE resolve it.
          allowDefaultProject: ['*.js', '*.mjs', '*.cjs'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'no-console': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Funnel env access through src/configs/env.ts (best-practices rule #6).
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='process'][property.name='env']",
          message: "Read env via src/configs/env.ts; don't access process.env directly.",
        },
      ],
    },
  },
  {
    // env.ts is the one allowed reader of process.env.
    files: ['src/configs/env.ts', 'scripts/**/*.ts'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  {
    // Scripts are CLIs — `console` is the right output channel.
    files: ['scripts/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  prettier,
);
