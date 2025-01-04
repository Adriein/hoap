/*
 * Copyright (c) 2024 Adria Claret <adria.claret@gmail.com>
 * MIT Licensed
 */

import HoapParser from "./HoapParser";
import fs from "fs";
import {Parser} from "@src/Parser";
import {ParserConfig} from "@src/ParserConfig";
import {WatchedXmlTagsJson} from "@Shared/Types";
import {UTF_8_ENCODING} from "@Shared/Constants";
import {ParserV2} from "@src/Parserv2";

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
const PARSER_WATCHED_XML_TAGS_CONFIG_FILE = `${process.cwd()}/src/hoap.config.json`;

const watchedXmlTagsJson: WatchedXmlTagsJson = JSON.parse(
    fs.readFileSync(PARSER_WATCHED_XML_TAGS_CONFIG_FILE, { encoding: UTF_8_ENCODING})
);

const config: ParserConfig = ParserConfig
    .instance()
    .withFilePath(AMADEUS_TEST_XML)
    .withConfigFile(watchedXmlTagsJson)

// const hoap: Parser = new Parser(config);

const hoap: ParserV2 = new ParserV2(config);

hoap.parse().then(response => console.log(response));
