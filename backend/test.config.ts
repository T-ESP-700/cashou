export default {
    test: {
        timeout: 30000,
        coverage: {
            enabled: true,
            dir: './coverage',
            reporter: ['text', 'lcov', 'html'],
            skipNodeModules: true
        }
    }
};