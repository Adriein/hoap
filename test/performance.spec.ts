import HoapParser from "../src/HoapParser";


describe('Performance comparison',  ():void => {
    test('Should transform base case XML into POJO in under 500ms', async (): Promise<void> => {
        const hoap: HoapParser = new HoapParser();

        const startTime = performance.now();

        await hoap.parse()

        const endTime = performance.now();

        const executionTime = endTime - startTime;

        expect(executionTime).toBeLessThan(500);
    });
});