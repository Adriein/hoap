/*
 * Copyright (c) 2024 Adria Claret <adria.claret@gmail.com>
 * MIT Licensed
 */

import fs from "fs";
import {ParserConfig} from "@src/ParserConfig";
import {WatchedXmlTagsJson} from "@Shared/Types";
import {UTF_8_ENCODING} from "@Shared/Constants";
import {HoapParser} from "@src/HoapParser";
import {ReadStream} from "node:fs";

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
