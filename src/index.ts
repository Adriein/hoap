import HoapParser from "./HoapParser";
import fs from "fs";

const hoap: HoapParser = new HoapParser();

const rawData: string = fs.readFileSync(
    `${process.cwd()}/test/xml/Fare_MasterPricerTravelBoardSearchResponse.xml`,
    'utf8'
);
hoap.parse(rawData)
    .then(_=> {})
    .catch(error => console.log(error));

