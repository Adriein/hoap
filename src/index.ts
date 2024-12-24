import HoapParser from "./HoapParser";
import fs from "fs";
import {Parser} from "./Parser";
import {ParserConfig} from "./ParserConfig";

/*const hoap: HoapParser = new HoapParser();

const rawData: string = fs.readFileSync(
    `${process.cwd()}/test/xml/Fare_MasterPricerTravelBoardSearchResponse.xml`,
    'utf8'
);
hoap.parse(rawData)
    .then(_=> {})
    .catch(error => console.log(error));
*/

const AMADEUS_TEST_XML = `${process.cwd()}/test/xml/Fare_MasterPricerTravelBoardSearchResponse.xml`;

const config: ParserConfig = ParserConfig
    .instance()
    .withFilePath(AMADEUS_TEST_XML)

const hoap: Parser = new Parser(config);

hoap.parse()
