import HoapParser from "../src/HoapParser";
import fs from "fs";
import FastXMLParser from "../src/FastXMLParser";


describe('Performance comparison',  ():void => {
    test('Should transform base case XML into POJO in under 1000ms', async (): Promise<void> => {
        const fastXML: FastXMLParser = new FastXMLParser();
        const hoap: HoapParser = new HoapParser();

        const rawData: string = fs.readFileSync(
            `${process.cwd()}/test/xml/Fare_MasterPricerTravelBoardSearchResponse.xml`,
            'utf8'
        );

        const startTime: number = performance.now();

        await hoap.parse(rawData)

        const endTime: number = performance.now();

        const hoapExecutionTime: number = endTime - startTime;

        expect(hoapExecutionTime).toBeLessThan(1000);
    });
});