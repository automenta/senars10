module.exports = {
    testEnvironment: 'node',
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