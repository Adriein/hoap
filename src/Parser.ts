/*
 * Copyright (c) 2024 Adria Claret <adria.claret@gmail.com>
 * MIT Licensed
 */

import fs from "node:fs";
import {ReadStream} from "node:fs";
import {ParserConfig} from "./ParserConfig";
import {UTF_8_ENCODING} from "./constants";

export class Parser {
    private readonly WATCHED_TAGS: Map<string, Buffer<ArrayBuffer>[]>;
    private readonly LARGEST_XML_TAG_BYTES: number = 0;

    public constructor(
        private config: ParserConfig
    ) {
        this.WATCHED_TAGS = new Map<string, Buffer<ArrayBuffer>[]>();

        for (let i: number = 0; i < config.tags.length; i++) {
            let xmlTag: string = config.tags[i]!;

            /*
             * Create open and close versions of the watched XML tag
             */
            let xmlOpenTag: string = `<${xmlTag}>`;
            let xmlClosingTag: string = `</${xmlTag}>`;

            let rawBinaryXmlOpenTag: Buffer<ArrayBuffer> = Buffer.from(xmlOpenTag, UTF_8_ENCODING);
            let rawBinaryXmlClosingTag: Buffer<ArrayBuffer> = Buffer.from(xmlClosingTag, UTF_8_ENCODING);

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
             * Map<'recommendations', ['<recommendations>', '</recommendations>']>
             */
            this.WATCHED_TAGS.set(xmlTag, [rawBinaryXmlOpenTag, rawBinaryXmlClosingTag]);
        }
    }

    public parse(): void {
        if (!this.config.path) {
            throw new Error('No path provided');
        }

        const stream: ReadStream = fs.createReadStream(this.config.path);

        let bufferLeftover: Buffer<ArrayBuffer> = Buffer.alloc(0);
        
        const binaryXmlTags: MapIterator<[string, Buffer<ArrayBuffer>[]]> = this.WATCHED_TAGS.entries();

        let iteratorResult: IteratorResult<[string, Buffer<ArrayBuffer>[]]> = this.restartMapIterator();

        stream.on("data", (chunk: Buffer<ArrayBuffer>): void => {
            const chunkCombinedWithLeftover: Buffer<ArrayBuffer> = Buffer.concat([bufferLeftover, chunk]);

            while (!iteratorResult.done) {
                const binaryXmlTags: Buffer<ArrayBuffer>[] = iteratorResult.value[1]

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

    private restartMapIterator(): IteratorResult<[string, Buffer<ArrayBuffer>[]]> {
       return this.WATCHED_TAGS.entries().next();
    }
}