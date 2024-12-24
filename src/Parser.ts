import fs from "node:fs";
import {ReadStream} from "node:fs";
import {ParserConfig} from "./ParserConfig";

export class Parser {
    private WATCHED_TAGS: Map<string, string>;

    public constructor(
        private config: ParserConfig
    ) {
        this.WATCHED_TAGS = new Map<string, string>();
    }

    public parse(): void {
        if (!this.config.path) {
            throw new Error('No path provided');
        }

        const stream: ReadStream = fs.createReadStream(this.config.path);

        const bufferLeftover: Buffer<ArrayBuffer> = Buffer.alloc(0);

        stream.on("data", (chunk: Buffer): void => {
            console.log(chunk.byteLength)
        })
    }
}