/*
 * Copyright (c) 2024 Adria Claret <adria.claret@gmail.com>
 * MIT Licensed
 */

import fs from "node:fs";
import {ReadStream} from "node:fs";
import {ParserConfig} from "./ParserConfig";
import {UTF_8_ENCODING} from "./constants";

export class Parser {
    private readonly WATCHED_TAGS: Map<Buffer<ArrayBuffer>, string>;
    private readonly LARGEST_XML_TAG_BYTES: number = 0;

    public constructor(
        private config: ParserConfig
    ) {
        this.WATCHED_TAGS = new Map<Buffer<ArrayBuffer>, string>();

        for (let i: number = 0; i < config.tags.length; i++) {
            let xmlTag: string = config.tags[i]!;
            let buffer: Buffer<ArrayBuffer> = Buffer.from(xmlTag, UTF_8_ENCODING);

            //We store the largest xml tag length to avoid missing info later on chunks
            if (buffer.byteLength > this.LARGEST_XML_TAG_BYTES) {
                this.LARGEST_XML_TAG_BYTES = buffer.byteLength;
            }

            /* We create a Map<Buffer,string> where we set as a key the binary form of xml tag
             * for quick search on parsing
             */
            this.WATCHED_TAGS.set(buffer, xmlTag);
        }
    }

    public parse(): void {
        if (!this.config.path) {
            throw new Error('No path provided');
        }

        const stream: ReadStream = fs.createReadStream(this.config.path);

        let bufferLeftover: Buffer<ArrayBuffer> = Buffer.alloc(0);
        
        const binaryXmlTags: MapIterator<Buffer<ArrayBuffer>> = this.WATCHED_TAGS.keys();

        let binaryXmlTag: IteratorResult<Buffer<ArrayBuffer> | undefined> = binaryXmlTags.next();

        stream.on("data", (chunk: Buffer<ArrayBuffer>): void => {
            const chunkCombinedWithLeftover: Buffer<ArrayBuffer> = Buffer.concat([bufferLeftover, chunk]);

            while (!binaryXmlTag.done) {
                const index: number = chunkCombinedWithLeftover.indexOf(binaryXmlTag.value!);

                if (index !== -1) {
                    const tag: Buffer<ArrayBuffer> = chunkCombinedWithLeftover.subarray(
                        index,
                        index + binaryXmlTag.value!.byteLength
                    );

                    console.log(tag.toString());

                    break;
                }

                binaryXmlTag = binaryXmlTags.next();
            }

            const start: number = chunkCombinedWithLeftover.length - this.LARGEST_XML_TAG_BYTES;
            bufferLeftover = chunkCombinedWithLeftover.subarray(start, chunkCombinedWithLeftover.length);

            const newIterator: MapIterator<Buffer<ArrayBuffer>> = this.WATCHED_TAGS.keys();
            binaryXmlTag = newIterator.next();
        })
    }
}