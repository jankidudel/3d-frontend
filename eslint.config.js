import eslint from '@eslint/js';
import angular from 'angular-eslint';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

const routeConstantRules = {
  rules: {
    'internal-link-constants': {
      meta: {
        type: 'problem',
        schema: [],
        messages: {
          useConstant:
            'Use the existing route constants for internal page links.',
        },
      },
      create(context) {
        function checkLink(node) {
          if (node.name !== 'href' && node.name !== 'routerLink') {
            return;
          }
          const value =
            typeof node.value === 'string'
              ? node.value
              : node.value?.ast?.value;
          if (
            typeof value === 'string' &&
            value.startsWith('/') &&
            !value.startsWith('/examples/')
          ) {
            context.report({ node, messageId: 'useConstant' });
          }
        }
        return { TextAttribute: checkLink, BoundAttribute: checkLink };
      },
    },
  },
};

export default defineConfig(
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      curly: ['error', 'all'],
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
  },
  {
    files: ['src/app/**/*.html'],
    plugins: { inspectmesh: routeConstantRules },
    rules: { 'inspectmesh/internal-link-constants': 'error' },
  },
);
