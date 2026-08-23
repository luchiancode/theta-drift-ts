module.exports = {
  displayName: 'theta-drift-api',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/theta-drift-api',
  testPathIgnorePatterns: ['<rootDir>/e2e/'],
};
