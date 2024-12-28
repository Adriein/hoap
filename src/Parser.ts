/*
 * Copyright (c) 2024 Adria Claret <adria.claret@gmail.com>
 * MIT Licensed
 */

import fs from "node:fs";
import {ReadStream} from "node:fs";
import {ParserConfig} from "./ParserConfig";
import {RawBinaryXmlTagPair} from "./Shared/types";
import {XmlTreeNode} from "./Shared/XmlTreeNode";
import {XmlTreeTraversal} from "./Shared/XmlTreeTraversal";

export class Parser {
    private readonly WATCHED_XML_TAG_TREE: XmlTreeNode;
    private LARGEST_XML_TAG_BYTES: number = 0;

    public constructor(
        private config: ParserConfig
    ) {
        if (!config.configFile) {
            throw new Error('No config file provided')
        }

        const tree: XmlTreeNode = XmlTreeNode.fromHoapConfigJson(config.configFile);

        this.WATCHED_XML_TAG_TREE = tree;

        XmlTreeTraversal.dfs.call(this, tree, (node: XmlTreeNode): void => {
            /*
             * Store the largest xml tag length to avoid missing info later on chunks
             */
            if (node.data.close.byteLength > this.LARGEST_XML_TAG_BYTES) {
                this.LARGEST_XML_TAG_BYTES = node.data.close.byteLength;
            }
        })
    }

    public parse(): void {
        if (!this.config.path) {
            throw new Error('No path provided');
        }

        const stream: ReadStream = fs.createReadStream(this.config.path);

        let bufferLeftover: Buffer<ArrayBuffer> = Buffer.alloc(0);

        const resultTree: XmlTreeNode = this.WATCHED_XML_TAG_TREE;

        stream.on("data", (chunk: Buffer<ArrayBuffer>): void => {
            const chunkCombinedWithLeftover: Buffer<ArrayBuffer> = Buffer.concat([bufferLeftover, chunk]);

            XmlTreeTraversal.dfs(this.WATCHED_XML_TAG_TREE, (node: XmlTreeNode): void => {
                const {original, type, open, close}: RawBinaryXmlTagPair = node.data;

                const openTagIndex: number = chunkCombinedWithLeftover.indexOf(open);
                const closeTagIndex: number = chunkCombinedWithLeftover.indexOf(close);

                if (openTagIndex !== -1) {
                    let relevantChunkPart: Buffer<ArrayBuffer> = chunkCombinedWithLeftover.subarray(
                        openTagIndex - open.byteLength,
                        closeTagIndex + close.byteLength
                    );

                    console.log(relevantChunkPart.toString());
                }
            });

            const start: number = chunkCombinedWithLeftover.length - this.LARGEST_XML_TAG_BYTES;

            bufferLeftover = chunkCombinedWithLeftover.subarray(start, chunkCombinedWithLeftover.length);
        });
    }
}