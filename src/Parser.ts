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

            //
            if (buffer.byteLength > this.LARGEST_XML_TAG_BYTES) {
                this.LARGEST_XML_TAG_BYTES = buffer.byteLength;
            }

            this.WATCHED_TAGS.set(buffer, xmlTag);
        }
    }

    public parse(): void {
        if (!this.config.path) {
            throw new Error('No path provided');
        }

        const stream: ReadStream = fs.createReadStream(this.config.path);

        const bufferLeftover: Buffer<ArrayBuffer> = Buffer.alloc(this.LARGEST_XML_TAG_BYTES);

        stream.on("data", (chunk: Buffer): void => {
            const chunkCombinedWithLeftover: Buffer<ArrayBuffer> = Buffer.concat([bufferLeftover, chunk]);
        })
    }
}