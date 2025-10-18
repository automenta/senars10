export default {
    testEnvironment: 'node',
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    testPathIgnorePatterns: [
        'v8/.*',
        'v9/.*',
    ],
    transform: {
        '^.+\\.js$': 'babel-jest',
    },
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/**/*.test.js',
    ],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80,
        },
    },
};