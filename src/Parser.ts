/*
 * Copyright (c) 2024 Adria Claret <adria.claret@gmail.com>
 * MIT Licensed
 */

import fs, {ReadStream} from "node:fs";
import {ParserConfig} from "./ParserConfig";
import {JsonResultData, RawBinaryXmlTagPair, ResultTreeMetadata} from "./Shared/Types";
import {XmlTreeNode} from "./Shared/Tree/XmlTreeNode";
import {XmlTreeTraverser} from "./Shared/Tree/XmlTreeTraverser";
import {UTF_8_ENCODING, XML_NODE_TYPE} from "./Shared/Constants";
import {ResultTreeNode} from "./Shared/Tree/ResultTreeNode";
import {InstructionTreeBuilder} from "./InstructionTreeBuilder";

export class Parser {
    private readonly WATCHED_XML_TAG_TREE: XmlTreeNode;
    private readonly RESULT_TREE_HASH_MAP: Map<string, ResultTreeNode[]> = new Map<string, ResultTreeNode[]>();

    public constructor(
        private config: ParserConfig
    ) {
        if (!config.configFile) {
            throw new Error('No config file provided')
        }

        this.WATCHED_XML_TAG_TREE = InstructionTreeBuilder.fromHoapConfigJson(config.configFile);
    }

    public parse(): void {
        if (!this.config.path) {
            throw new Error('No path provided');
        }

        const stream: ReadStream = fs.createReadStream(this.config.path);

        let bufferLeftover: Buffer<ArrayBuffer> = Buffer.alloc(0);

        const instructionTreeCopy: XmlTreeNode = this.WATCHED_XML_TAG_TREE;
        const resultTree: ResultTreeNode = ResultTreeNode.init();

        this.RESULT_TREE_HASH_MAP.set("root", [resultTree]);

        let globalIndexPosition: number = 0;

        stream.on("data", (chunk: Buffer<ArrayBuffer>): void => {
            const chunkCombinedWithLeftover: Buffer<ArrayBuffer> = Buffer.concat([bufferLeftover, chunk]);

            let securityBytesBuffer: number = 0;

            XmlTreeTraverser.dfs(instructionTreeCopy, (node: XmlTreeNode, path: string): void => {
                const {original, type, open, close}: RawBinaryXmlTagPair = node.data;

                let observedChunk: Buffer<ArrayBuffer> = chunkCombinedWithLeftover;
                let subtractedChunkBytes: number = 0;

                let openTagIndex: number = 0;
                let closeTagIndex: number = 0;

                while(openTagIndex !== -1) {
                    openTagIndex = observedChunk.indexOf(open);
                    closeTagIndex = observedChunk.indexOf(close);

                    if (openTagIndex !== -1 && closeTagIndex !== -1) {
                        /* The closing tag index is greater than opening tag
                         * meaning that is a closing tag from another chunk
                         */
                        if(closeTagIndex < openTagIndex) {
                            this.closeOpenNode(path, closeTagIndex + globalIndexPosition);

                            const currentObservedChunkBytes: number = observedChunk.byteLength;

                            observedChunk = observedChunk.subarray(
                                closeTagIndex + close.byteLength,
                                chunkCombinedWithLeftover.byteLength
                            );

                            subtractedChunkBytes = subtractedChunkBytes + (currentObservedChunkBytes - observedChunk.byteLength);

                            continue;
                        }

                        if(type !== XML_NODE_TYPE) {
                            const rawBinaryValue: Buffer<ArrayBuffer> = observedChunk.subarray(
                                openTagIndex + open.byteLength,
                                closeTagIndex
                            );

                            const result: ResultTreeNode = this.createResultNode(
                                original,
                                openTagIndex + globalIndexPosition + subtractedChunkBytes,
                                closeTagIndex + globalIndexPosition + subtractedChunkBytes,
                                rawBinaryValue.toString(UTF_8_ENCODING)
                            )

                            this.registerNewNode(path, result);

                            this.append(path, result);

                            const currentObservedChunkBytes: number = observedChunk.byteLength;

                            observedChunk = observedChunk.subarray(
                                closeTagIndex + close.byteLength,
                                chunkCombinedWithLeftover.byteLength
                            );

                            subtractedChunkBytes = subtractedChunkBytes + (currentObservedChunkBytes - observedChunk.byteLength);

                            continue;
                        }

                        const result: ResultTreeNode = this.createResultNode(
                            original,
                            openTagIndex + globalIndexPosition + subtractedChunkBytes,
                            closeTagIndex + globalIndexPosition + subtractedChunkBytes
                        )

                        this.registerNewNode(path, result);

                        this.append(path, result);

                        const currentObservedChunkBytes: number = observedChunk.byteLength;

                        observedChunk = observedChunk.subarray(
                            closeTagIndex + close.byteLength,
                            chunkCombinedWithLeftover.byteLength
                        );

                        subtractedChunkBytes = subtractedChunkBytes + (currentObservedChunkBytes - observedChunk.byteLength);

                        continue;
                    }

                    if (openTagIndex !== -1) {
                        if(type !== XML_NODE_TYPE) {
                            securityBytesBuffer = chunk.byteLength - (openTagIndex + subtractedChunkBytes);

                            continue;
                        }

                        const result: ResultTreeNode = this.createResultNode(
                            original,
                            openTagIndex + globalIndexPosition + subtractedChunkBytes,
                            closeTagIndex === -1 ? -1 : closeTagIndex + globalIndexPosition + subtractedChunkBytes
                        )

                        this.registerNewNode(path, result);

                        this.append(path, result);

                        const currentObservedChunkBytes: number = observedChunk.byteLength;

                        observedChunk = observedChunk.subarray(
                            openTagIndex + open.byteLength,
                            chunkCombinedWithLeftover.byteLength
                        );

                        subtractedChunkBytes = subtractedChunkBytes + (currentObservedChunkBytes - observedChunk.byteLength);
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

    /**
     * Append the result node to the correct parent in the result tree
     * @param path current level from the instructions tree
     * @param node ResultTreeNode
     * @returns void
     */
    private append(path: string, node: ResultTreeNode): void {
        const parentLvlKey: string = path.substring(0, path.lastIndexOf("/"));

        const parents: ResultTreeNode[] | undefined = this.RESULT_TREE_HASH_MAP.get(parentLvlKey !== ""? parentLvlKey : "root");

        if (!parents) {
            throw new Error('Invalid or empty array');
        }

        if (node.metadata.position.close === -1) {
            for (let i: number = 0; i < parents.length; i++) {
                const parent: ResultTreeNode = parents[i]!;

                if (parent.metadata.position.close === -1) {
                    parent.addChild(node);

                    break;
                }
            }

            return;
        }

        for (let i: number = 0; i < parents.length; i++) {
            const parent: ResultTreeNode = parents[i]!;

            if (parent.metadata.position.close === -1) {
                parent.addChild(node);

                break;
            }

            if (parent.isInRange(node.metadata.position.open, node.metadata.position.close)) {
                parent.addChild(node);

                break;
            }
        }
    }

    /**
     * Close a node without closing tag already set
     * @param path current level from the instructions tree
     * @param closeIndexPosition Current close index where the parser found the closing tag
     * @returns void
     */
    private closeOpenNode(path: string, closeIndexPosition: number): void {
        const nodes: ResultTreeNode[] = this.RESULT_TREE_HASH_MAP.get(path)!;

        // The first item found with closing tag -1 is the correct one since the parser is going top down and the
        // items are being inserted in the hash map in order as the parser founds them
        for (let i: number = 0; i < nodes.length; i++) {
            const node: ResultTreeNode = nodes[i]!;

            if (node.metadata.position.close === -1) {
                node.metadata.position.close = closeIndexPosition;

                break;
            }
        }
    }

    /**
     * Register a node in the hash map
     * @param path current level from the instructions tree
     * @param node ResultTreeNode
     * @returns void
     */
    private registerNewNode(path: string, node: ResultTreeNode): void {
        const nodes: ResultTreeNode[] | undefined = this.RESULT_TREE_HASH_MAP.get(path);

        if (!nodes) {
            this.RESULT_TREE_HASH_MAP.set(path, [node]);

            return;
        }

        nodes!.push(node);
    }

    /**
     * Create a new result node
     * @param tagName Original XML tag name string without closing or opening symbols
     * @param open Position of the XML openTag relative to the whole XML response
     * @param close Position of the XML closeTag relative to the whole XML response
     * @param value Value of the tag in case is a data node
     * @returns ResultTreeNode
     */
    private createResultNode(
        tagName: string,
        open: number,
        close: number,
        value: string | number | null = null
    ): ResultTreeNode {
        const data: JsonResultData = { tagName, value };

        const metadata: ResultTreeMetadata = {position: {open, close}};

        return new ResultTreeNode(data, metadata);
    }
}