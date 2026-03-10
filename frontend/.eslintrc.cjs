module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  globals: {
    L: 'readonly',
  },
  extends: [
    'eslint:recommended',
    'prettier',
  ],
  plugins: ['vue'],
  parser: 'vue-eslint-parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'vue/multi-word-component-names': 'off',
    'no-unused-vars': 'warn',
    'no-dupe-keys': 'warn',
    'no-prototype-builtins': 'warn',
    'vue/no-v-html': 'warn',
    'no-empty': 'warn',
  },
};
