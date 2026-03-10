module.exports = {
  env: {
    node: true,
    es2021: true,
  },
  extends: ['eslint:recommended', 'plugin:n/recommended', 'prettier'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'no-console': 'warn',
    'no-unused-vars': 'warn',
    'n/no-process-exit': 'warn',
    'no-async-promise-executor': 'warn',
    'no-useless-escape': 'warn',
  },
  overrides: [
    {
      files: ['src/__tests__/**/*.js'],
      env: {
        jest: true,
      },
      rules: {
        'n/no-unpublished-import': 'off',
        'n/no-extraneous-import': 'off',
      },
    },
  ],
};
