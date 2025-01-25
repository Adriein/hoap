/*
 * Copyright (c) 2024 Adria Claret <adria.claret@gmail.com>
 * MIT Licensed
 */

import {ParserConfig} from "@parser/ParserConfig";
import {WatchedXmlTagsJson} from "@shared/Types";
import {UTF_8_ENCODING} from "@shared/Constants";
import fs from "node:fs";
import {Https} from "@soap/Https";
import {HoapParser} from "@parser/HoapParser";

const AMADEUS_TEST_XML = `${process.cwd()}/test/xml/Fare_MasterPricerTravelBoardSearchResponse.xml`;
const PARSER_WATCHED_XML_TAGS_CONFIG_FILE = `${process.cwd()}/src/hoap.config2.json`;

const watchedXmlTagsJson: WatchedXmlTagsJson = JSON.parse(
    fs.readFileSync(PARSER_WATCHED_XML_TAGS_CONFIG_FILE, { encoding: UTF_8_ENCODING})
);

const config: ParserConfig = ParserConfig
    .instance()
    .withConfigFile(watchedXmlTagsJson)

const hoap: HoapParser = new HoapParser(config);

const https = new Https(hoap);

const {promise, abort} = https.do("www.dataaccess.com/webservicesserver/NumberConversion.wso", 1);

promise.then((result) => {
    console.log(result);
});
