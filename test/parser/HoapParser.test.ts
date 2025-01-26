/*
 * Copyright (c) 2025 Adria Claret <adria.claret@gmail.com>
 * MIT Licensed
 */

import fs, {ReadStream} from "node:fs";
import {HoapParser} from "@parser/HoapParser";
import {Result, WatchedXmlTagsJson} from "@shared/Types";
import {UTF_8_ENCODING} from "@shared/Constants";
import {ParserConfig} from "@parser/ParserConfig";
import {expect, test, describe} from 'vitest'

const AMADEUS_TEST_XML: string = `${process.cwd()}/test/xml/Fare_MasterPricerTravelBoardSearchResponse.xml`;
const AMADEUS_BASE_PARSING_RESULT: string = `${process.cwd()}/test/json/baseParsingResult.json`;
const PARSER_WATCHED_XML_TAGS_CONFIG_FILE: string = `${process.cwd()}/src/hoap.config.json`;

describe('HoapParser',  ():void => {
    test('Should parse the XML into a correct POJO', async (): Promise<void> => {
        const watchedXmlTagsJson: WatchedXmlTagsJson = JSON.parse(
            fs.readFileSync(PARSER_WATCHED_XML_TAGS_CONFIG_FILE, {encoding: UTF_8_ENCODING})
        );

        const baseResult = JSON.parse(
            fs.readFileSync(AMADEUS_BASE_PARSING_RESULT, {encoding: UTF_8_ENCODING})
        );

        const config: ParserConfig = ParserConfig
            .instance()
            .withConfigFile(watchedXmlTagsJson)

        const hoap: HoapParser = new HoapParser(config);

        const stream: ReadStream = fs.createReadStream(AMADEUS_TEST_XML);

        const result: Result = await hoap.parse(stream);

        expect(result).toStrictEqual(baseResult);
    });

    test('Should transform base case XML into POJO in under 1000ms', async (): Promise<void> => {
        const watchedXmlTagsJson: WatchedXmlTagsJson = JSON.parse(
            fs.readFileSync(PARSER_WATCHED_XML_TAGS_CONFIG_FILE, { encoding: UTF_8_ENCODING})
        );

        const parserConfig: ParserConfig = ParserConfig
            .instance()
            .withConfigFile(watchedXmlTagsJson);

        const hoap: HoapParser = new HoapParser(parserConfig);

        const stream: ReadStream = fs.createReadStream(AMADEUS_TEST_XML);

        const startTime: number = performance.now();

        await hoap.parse(stream)

        const endTime: number = performance.now();

        const hoapExecutionTime: number = endTime - startTime;

        expect(hoapExecutionTime).toBeLessThan(1000);
    });
});