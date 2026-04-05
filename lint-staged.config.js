export default {
  '*.{ts,js}': ['eslint --fix', 'prettier --write'],
  '*.{json,md}': ['prettier --write'],
  '*/src/**/*.{ts,js}': ['eslint --fix', 'prettier --write'], // Format typeScript files in all workspace directories
};
