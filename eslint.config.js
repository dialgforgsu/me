'use strict';

const globals = require('globals');

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        YT:   'readonly', // YouTube IFrame API (loaded dynamically in script.js)
        ICAL: 'readonly', // ical.js loaded from CDN in index.html
      },
      ecmaVersion: 2021,
      sourceType: 'script',
    },
    rules: {
      'no-unused-vars': [
        'warn',
        {
          args: 'after-used',
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-undef': 'error',
    },
  },
  {
    ignores: ['node_modules/', 'package-lock.json', 'calendar.json'],
  },
];
