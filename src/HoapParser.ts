import {XMLParser} from "fast-xml-parser";
import fs from "fs";

export default class HoapParser {
    public async parse(): Promise<void> {
        const parser = new XMLParser();
        const rawData = fs.readFileSync(
            `${process.cwd()}/test/xml/Fare_MasterPricerTravelBoardSearchResponse.xml`,
            'utf8'
        );

        const result = parser.parse(rawData);

        console.log(result['soap:Envelope']['soap:Body']);
    }
}