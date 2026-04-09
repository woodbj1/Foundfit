import { defineConfig } from 'eslint/config'
import tsParser from '@typescript-eslint/parser'

export default defineConfig([
  {
    ignores: ['node_modules/**', '.expo/**', 'dist/**'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {},
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    rules: {},
  },
])
