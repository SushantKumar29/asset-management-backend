module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // New feature
        'fix', // Bug fix
        'conf', // Configuration
        'docs', // Documentation
        'style', // Code style (formatting, missing semicolons)
        'refactor', // Code refactoring
        'perf', // Performance improvement
        'test', // Adding/updating tests
        'revert', // Revert a previous commit
        'build', // Build system or dependencies
        'ci', // CI configuration changes
      ],
    ],
    'subject-case': [2, 'never', ['start-case', 'pascal-case']],
  },
};
