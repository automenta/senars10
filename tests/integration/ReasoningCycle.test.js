import {TaskMatch, TestNAR} from '../../src/testing/TestNAR.js';
import {Logger} from '../../src/util/Logger.js';
import {jest} from '@jest/globals';

describe('NAL Reasoning Cycle Validation', () => {
    let consoleInfoSpy;

    beforeEach(() => {
        Logger.setSilent(false);
        consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {
        });
    });

    afterEach(() => {
        Logger.setSilent(true);
        consoleInfoSpy.mockRestore();
    });

    it('should perform a basic deduction', async () => {
        const testNAR = new TestNAR();
        const result = await testNAR
            .input('(a ==> b)', 0.9, 0.9)
            .input('(b ==> c)', 0.9, 0.9)
            .run(20) // More cycles to ensure inference
            .expect(new TaskMatch('(a ==> c)'))
            .execute();

        const nar = testNAR.getNAR();

        expect(result).toBe(true);
    });
});
