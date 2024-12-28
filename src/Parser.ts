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
import {XML_DATA_TYPE, XML_NODE_TYPE, XmlTreeNodeStatus} from "./Shared/constants";

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
            let securityBytesBuffer: number = this.LARGEST_XML_TAG_BYTES;

            XmlTreeTraversal.dfs(resultTree, (node: XmlTreeNode): void => {
                const {type, open, close}: RawBinaryXmlTagPair = node.data;

                if (type.includes(XML_DATA_TYPE)) {
                    const tagMatchStack: number[][] = [];

                    let openTagIndex: number = 0;
                    let closeTagIndex: number = 0;
                    let originalChunkIndexPosition: number = 0;

                    let observedChunk: Buffer<ArrayBuffer> = chunkCombinedWithLeftover;

                    // Find the position of all matches of the same tree node in the current chunk
                    while(openTagIndex !== -1) {
                        openTagIndex = observedChunk.indexOf(open);
                        closeTagIndex = observedChunk.indexOf(close);

                        // If the closing tag is found we change the position of the observation window
                        if (closeTagIndex !== -1) {
                            observedChunk = observedChunk.subarray(
                                closeTagIndex + close.byteLength,
                                chunkCombinedWithLeftover.byteLength
                            );

                            originalChunkIndexPosition = closeTagIndex + close.byteLength + originalChunkIndexPosition;

                            // Store the index position relative to the current chunk and not the observed subarray
                            tagMatchStack.push([
                                openTagIndex + originalChunkIndexPosition,
                                closeTagIndex + originalChunkIndexPosition
                            ]);

                            securityBytesBuffer = this.LARGEST_XML_TAG_BYTES;

                            continue;
                        }

                        const leftOverWithOpenTagIncluded: Buffer<ArrayBuffer> = chunkCombinedWithLeftover.subarray(
                            openTagIndex + originalChunkIndexPosition,
                            chunkCombinedWithLeftover.byteLength
                        )

                        securityBytesBuffer = chunkCombinedWithLeftover.byteLength - leftOverWithOpenTagIncluded.byteLength;
                    }
                }
            });

            const start: number = chunkCombinedWithLeftover.byteLength - securityBytesBuffer;

            bufferLeftover = chunkCombinedWithLeftover.subarray(start, chunkCombinedWithLeftover.length);
        });
    }
}