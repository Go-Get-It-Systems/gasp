/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['./jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|nativewind|react-native-reanimated|react-native-gesture-handler|lucide-react-native|socket\\.io-client)',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/android/', '/.expo/'],
  collectCoverageFrom: [
    'stores/**/*.ts',
    'services/**/*.ts',
    'hooks/**/*.ts',
    '!**/__tests__/**',
    '!**/node_modules/**',
  ],
};
