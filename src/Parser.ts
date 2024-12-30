/*
 * Copyright (c) 2024 Adria Claret <adria.claret@gmail.com>
 * MIT Licensed
 */

import fs, {ReadStream} from "node:fs";
import {ParserConfig} from "./ParserConfig";
import {JsonResultData, RawBinaryXmlTagPair, ResultTreeMetadata} from "./Shared/types";
import {XmlTreeNode} from "./Shared/XmlTreeNode";
import {XmlTreeTraverser} from "./Shared/XmlTreeTraverser";
import {ParsingNodeStatus, UTF_8_ENCODING, XML_DATA_TYPE, XML_NODE_TYPE} from "./Shared/constants";
import {ResultTreeNode} from "./Shared/ResultTreeNode";
import {JsonTreeTraverser} from "./Shared/JsonTreeTraverser";

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

        XmlTreeTraverser.dfs.call(this, tree, (node: XmlTreeNode): void => {
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

        const instructionTreeCopy: XmlTreeNode = this.WATCHED_XML_TAG_TREE;
        const resultTree: ResultTreeNode = ResultTreeNode.init();
        let globalIndexPosition: number = 0;

        stream.on("data", (chunk: Buffer<ArrayBuffer>): void => {
            const chunkCombinedWithLeftover: Buffer<ArrayBuffer> = Buffer.concat([bufferLeftover, chunk]);

            let securityBytesBuffer: number = this.LARGEST_XML_TAG_BYTES;

            XmlTreeTraverser.dfs(instructionTreeCopy, (node: XmlTreeNode, depth: number): void => {
                const {original, type, open, close}: RawBinaryXmlTagPair = node.data;

                let observedChunk: Buffer<ArrayBuffer> = chunkCombinedWithLeftover;

                let openTagIndex: number = 0;
                let closeTagIndex: number = 0;

                if (type === XML_NODE_TYPE) {
                    while(openTagIndex !== -1) {
                        openTagIndex = observedChunk.indexOf(open);
                        closeTagIndex = observedChunk.indexOf(close);

                        if (openTagIndex !== -1 && closeTagIndex !== -1) {
                            /* The closing tag index is greater than opening tag 
                             * meaning that is a closing tag from another chunk 
                             */
                            if(closeTagIndex < openTagIndex) {
                                JsonTreeTraverser.bfsToLvl(resultTree, depth + 1, (resultNode: ResultTreeNode): void => {
                                    if (resultNode.metadata.status === ParsingNodeStatus.OPEN) {
                                        resultNode.metadata.status = ParsingNodeStatus.CLOSED;
                                        resultNode.metadata.position.close = closeTagIndex + globalIndexPosition;
                                    }
                                });

                                observedChunk = observedChunk.subarray(
                                    closeTagIndex + close.byteLength,
                                    chunkCombinedWithLeftover.byteLength
                                );

                                continue;
                            }
                            
                            const data: JsonResultData = { tagName: original, value: null };
                            const metadata: ResultTreeMetadata = {
                                status: ParsingNodeStatus.INFORMATION_NOT_EXTRACTED,
                                position: {
                                    open: openTagIndex + globalIndexPosition,
                                    close: closeTagIndex + globalIndexPosition
                                }
                            };

                            const result = new ResultTreeNode(data, metadata);

                            JsonTreeTraverser.bfsToLvl(resultTree, depth, (parentNode: ResultTreeNode): void => {
                                if (parentNode.metadata.status === ParsingNodeStatus.OPEN) {
                                    parentNode.addChild(result);

                                    return;
                                }

                                if (
                                    openTagIndex + globalIndexPosition > parentNode.metadata.position.open &&
                                    closeTagIndex + globalIndexPosition < parentNode.metadata.position.close
                                ) {
                                    parentNode.addChild(result);
                                }
                            });

                            observedChunk = observedChunk.subarray(
                                closeTagIndex + close.byteLength,
                                chunkCombinedWithLeftover.byteLength
                            );

                            continue;
                        }

                        if (openTagIndex !== -1) {
                            const data: JsonResultData = { tagName: original, value: null };
                            const metadata: ResultTreeMetadata = {
                                status: ParsingNodeStatus.OPEN,
                                position: {
                                    open: openTagIndex + globalIndexPosition,
                                    close: closeTagIndex +globalIndexPosition
                                }
                            };

                            const result = new ResultTreeNode(data, metadata);

                            JsonTreeTraverser.bfsToLvl(resultTree, depth, (parentNode: ResultTreeNode): void => {
                                if (parentNode.metadata.status === ParsingNodeStatus.OPEN || parentNode.data.tagName === "root") {
                                    parentNode.addChild(result);

                                    return;
                                }

                                if (
                                    openTagIndex + globalIndexPosition > parentNode.metadata.position.open &&
                                    closeTagIndex + globalIndexPosition < parentNode.metadata.position.close
                                ) {
                                    parentNode.addChild(result);
                                }
                            });

                            observedChunk = observedChunk.subarray(
                                openTagIndex + open.byteLength,
                                chunkCombinedWithLeftover.byteLength
                            );
                        }
                    }
                }

                if (type.includes(XML_DATA_TYPE)) {
                    // Find the position of all matches of the same tree node in the current chunk
                    while(openTagIndex !== -1) {
                        openTagIndex = observedChunk.indexOf(open);
                        closeTagIndex = observedChunk.indexOf(close);

                        if (openTagIndex !== -1 && closeTagIndex !== -1) {
                            const rawBinaryValue: Buffer<ArrayBuffer> = observedChunk.subarray(
                                openTagIndex + open.byteLength,
                                closeTagIndex
                            );

                            observedChunk = observedChunk.subarray(
                                closeTagIndex + close.byteLength,
                                chunkCombinedWithLeftover.byteLength
                            );

                            const data: JsonResultData = {
                                tagName: original,
                                value: rawBinaryValue.toString(UTF_8_ENCODING)
                            };
                            const metadata: ResultTreeMetadata = {
                                status: ParsingNodeStatus.OPEN,
                                position: {
                                    open: openTagIndex + globalIndexPosition,
                                    close: closeTagIndex + globalIndexPosition
                                }
                            };

                            const result = new ResultTreeNode(data, metadata);

                            JsonTreeTraverser.bfsToLvl(resultTree, depth, (parentNode: ResultTreeNode): void => {
                                if (parentNode.metadata.status === ParsingNodeStatus.OPEN) {
                                    parentNode.addChild(result);

                                    return;
                                }

                                if (
                                    openTagIndex + globalIndexPosition > parentNode.metadata.position.open &&
                                    closeTagIndex + globalIndexPosition < parentNode.metadata.position.close
                                ) {
                                    parentNode.addChild(result);
                                }
                            });
                        }
                    }
                }
            });

            const start: number = chunkCombinedWithLeftover.byteLength - securityBytesBuffer;

            bufferLeftover = chunkCombinedWithLeftover.subarray(start, chunkCombinedWithLeftover.length);

            globalIndexPosition = globalIndexPosition + chunk.byteLength;
        });

        stream.on("end", (): void => {
            console.log(resultTree);
        });
    }
}