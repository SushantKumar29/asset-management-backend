export default {
  '*.{ts,js}': ['eslint --fix', 'prettier --write'],
  '*.{json,md}': ['prettier --write'],
  '*/src/**/*.{ts,js}': ['eslint --fix', 'prettier --write'], // This line will format TypeScript files in all workspace directories
};
