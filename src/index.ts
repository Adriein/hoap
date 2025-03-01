/*
 * Copyright (c) 2024 Adria Claret <adria.claret@gmail.com>
 * MIT Licensed
 */

/*import {ParserConfig} from "@parser/ParserConfig";
import {Result, WatchedXmlTagsJson} from "@shared/Types";
import {UTF_8_ENCODING} from "@shared/Constants";
import fs from "node:fs";
import {SoapHttps} from "@soap/SoapHttps";
import {HoapParser} from "@parser/HoapParser";
import {SoapHttpConfig} from "@soap/SoapHttpConfig";
import {Agent} from "node:https";
import {JsonToXmlTransformer} from "@soap/JsonToXmlTransformer";
import {SoapClient} from "@soap/SoapClient";*/

export {ParserConfig} from "@parser/ParserConfig";
export {HoapParser} from "@parser/HoapParser"

export {SoapHttpConfig} from "@soap/SoapHttpConfig";
export {SoapClient} from "@soap/SoapClient";
export {SoapHttps} from "@soap/SoapHttps"

export type {Result, WatchedXmlTagsJson, JsonXmlBodyStruct} from "@shared/Types";

/*const startTime: number = performance.now();

const AMADEUS_TEST_XML = `${process.cwd()}/test/xml/Fare_MasterPricerTravelBoardSearchResponse.xml`;
const PARSER_WATCHED_XML_TAGS_CONFIG_FILE = `${process.cwd()}/src/hoap.config.json`;

const watchedXmlTagsJson: WatchedXmlTagsJson = JSON.parse(
    fs.readFileSync(PARSER_WATCHED_XML_TAGS_CONFIG_FILE, { encoding: UTF_8_ENCODING})
);

const parserConfig: ParserConfig = ParserConfig
    .instance()
    .withConfigFile(watchedXmlTagsJson)
//  .onDebugMode();

const hoap: HoapParser = new HoapParser(parserConfig);

const keepAliveAgent: Agent = new Agent({
    keepAlive: true,
    maxSockets: 500,
});

const httpConfig: SoapHttpConfig = SoapHttpConfig
    .instance()
    .withAgent(keepAliveAgent);

const transformer: JsonToXmlTransformer = new JsonToXmlTransformer()

const https = new SoapHttps(hoap, httpConfig);
const request: Promise<Result> = SoapClient
    .instance("", https, transformer)
    .withBody(body())
    .makeRequest();

request.then((result: Result): void => {
    const endTime: number = performance.now();

    const hoapExecutionTime: number = endTime - startTime;
    console.log(result.$position);
    console.log(hoapExecutionTime);
});*/
