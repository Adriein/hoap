/*
 * Copyright (c) 2024 Adria Claret <adria.claret@gmail.com>
 * MIT Licensed
 */

import {ParserConfig} from "@parser/ParserConfig";
import {Result, WatchedXmlTagsJson} from "@shared/Types";
import {UTF_8_ENCODING} from "@shared/Constants";
import fs from "node:fs";
import {Https} from "@soap/Https";
import {HoapParser} from "@parser/HoapParser";
import {HttpError} from "@soap/Error/HttpError";

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

const abortController = new AbortController();

const request: Promise<Result> = https.do(
    "www.dataaccess.com/webservicesserver/NumberConversion.wso",
    { timeout: 60_000, abortSignal: abortController.signal }
);

abortController.abort(HttpError.timeout())

request.then((result: Result): void => {
    console.log(result);
});
