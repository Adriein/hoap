/*
 * Copyright (c) 2024 Adria Claret <adria.claret@gmail.com>
 * MIT Licensed
 */

import fs from "node:fs";
import {ReadStream} from "node:fs";
import {ParserConfig} from "./ParserConfig";
import {UTF_8_ENCODING} from "./constants";
import {RawBinaryXmlTagPair} from "./types";

export class Parser {
    private readonly WATCHED_TAGS: Map<string, RawBinaryXmlTagPair>;
    private readonly LARGEST_XML_TAG_BYTES: number = 0;

    public constructor(
        private config: ParserConfig
    ) {
        this.WATCHED_TAGS = new Map<string, RawBinaryXmlTagPair>();

        for (let i: number = 0; i < config.tags.length; i++) {
            let xmlTag: string = config.tags[i]!;

            /*
             * Create open and close versions of the watched XML tag
             */
            let xmlOpenTag: string = `<${xmlTag}>`;
            let xmlClosingTag: string = `</${xmlTag}>`;

            let rawBinaryXmlOpenTag: Buffer<ArrayBuffer> = Buffer.from(xmlOpenTag, UTF_8_ENCODING);
            let rawBinaryXmlClosingTag: Buffer<ArrayBuffer> = Buffer.from(xmlClosingTag, UTF_8_ENCODING);

            const xmlTagPair: RawBinaryXmlTagPair = {
                open: rawBinaryXmlOpenTag,
                close: rawBinaryXmlClosingTag
            }

            /*
             * Store the largest xml tag length to avoid missing info later on chunks
             */
            if (rawBinaryXmlClosingTag.byteLength > this.LARGEST_XML_TAG_BYTES) {
                this.LARGEST_XML_TAG_BYTES = rawBinaryXmlClosingTag.byteLength;
            }

            /*
             * Create a Map<Buffer,string> where we set as a key the binary form of xml tag
             * for quick search on parsing.
             *
             * Example:
             * Map<'recommendations', {open: (binary)'<recommendations>', close: (binary)'</recommendations>'}>
             */
            this.WATCHED_TAGS.set(xmlTag, xmlTagPair);
        }
    }

    public parse(): void {
        if (!this.config.path) {
            throw new Error('No path provided');
        }

        const stream: ReadStream = fs.createReadStream(this.config.path);

        let bufferLeftover: Buffer<ArrayBuffer> = Buffer.alloc(0);
        
        const binaryXmlTags: MapIterator<[string, RawBinaryXmlTagPair]> = this.WATCHED_TAGS.entries();

        let iteratorResult: IteratorResult<[string, RawBinaryXmlTagPair]> = this.restartMapIterator();

        stream.on("data", (chunk: Buffer<ArrayBuffer>): void => {
            const chunkCombinedWithLeftover: Buffer<ArrayBuffer> = Buffer.concat([bufferLeftover, chunk]);

            while (!iteratorResult.done) {
                const {open, close}: RawBinaryXmlTagPair = iteratorResult.value[1];

                const openTagIndex: number = chunkCombinedWithLeftover.indexOf(open);
                const closeTagIndex: number = chunkCombinedWithLeftover.indexOf(close);

                for (let i: number = 0; i < binaryXmlTags.length; i++) {
                    const index: number = chunkCombinedWithLeftover.indexOf(binaryXmlTag);

                    if (index !== -1) {
                        const tag: Buffer<ArrayBuffer> = chunkCombinedWithLeftover.subarray(
                            index,
                            index + binaryXmlTag.value!.byteLength
                        );

                        console.log(tag.toString());

                        break;
                    }
                }


                binaryXmlTag = binaryXmlTags.next();
            }

            const start: number = chunkCombinedWithLeftover.length - this.LARGEST_XML_TAG_BYTES;
            bufferLeftover = chunkCombinedWithLeftover.subarray(start, chunkCombinedWithLeftover.length);

            binaryXmlTag = this.restartMapIterator();
        })
    }

    private restartMapIterator(): IteratorResult<[string, RawBinaryXmlTagPair]> {
       return this.WATCHED_TAGS.entries().next();
    }
}