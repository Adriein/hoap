import fs, {ReadStream} from "node:fs";
import {HoapParser} from "@parser/HoapParser";
import {WatchedXmlTagsJson} from "@shared/Types";
import {UTF_8_ENCODING} from "@shared/Constants";
import {ParserConfig} from "@parser/ParserConfig";

describe('HoapParser',  ():void => {
    test('Should parse the XML into a correct POJO', async (): Promise<void> => {
        const AMADEUS_TEST_XML = `${process.cwd()}/test/xml/Fare_MasterPricerTravelBoardSearchResponse.xml`;
        const PARSER_WATCHED_XML_TAGS_CONFIG_FILE = `${process.cwd()}/src/hoap.config.json`;

        const watchedXmlTagsJson: WatchedXmlTagsJson = JSON.parse(
            fs.readFileSync(PARSER_WATCHED_XML_TAGS_CONFIG_FILE, { encoding: UTF_8_ENCODING})
        );

        const config: ParserConfig = ParserConfig
            .instance()
            .withFilePath(AMADEUS_TEST_XML)
            .withConfigFile(watchedXmlTagsJson)

        const hoap: HoapParser = new HoapParser(config);

        const stream: ReadStream = fs.createReadStream(config.path!);

        hoap.parse(stream).then(json => console.log("Finish"));

    });
});