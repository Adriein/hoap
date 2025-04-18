/*
 * Copyright (c) 2024 Adria Claret <adria.claret@gmail.com>
 * MIT Licensed
 */

import {Readable} from "node:stream";
import {ParserConfig} from "@parser/ParserConfig";
import {InstructionTreeBuilder} from "@parser/Shared/Builder";
import {UTF_8_ENCODING, XML, XML_NODE_TYPE} from "@shared/Constants";
import {ParserConfigError} from "@parser/Shared/Error";
import {XmlTreeNode, XmlTreeTraverser} from "@parser/Shared/Tree";
import {RawBinaryXmlTagPair, Token} from "@shared/Types";
import {isInRange} from "@parser/Shared/Utils";
import {NodeParentNotFoundError} from "@parser/Shared/Error/NodeParentNotFoundError";

export class ParserV2 {
    private readonly WATCHED_XML_TAG_TREE: XmlTreeNode;
    private readonly RESULT_TREE_HASH_MAP: Map<string, Token[]> = new Map<string, Token[]>();

    public constructor(
        private config: ParserConfig
    ) {
        if (!config.configFile) {
            throw ParserConfigError.noConfigFile()
        }

        this.WATCHED_XML_TAG_TREE = InstructionTreeBuilder.fromHoapConfigJson(config.configFile);
    }

    public parse(stream: Readable): Promise<Token> {
        return new Promise((resolve: (json: Token) => void, reject: (error: Error) => void) => {
            if (!this.config.path) {
                throw ParserConfigError.noPathProvided();
            }

            let bufferLeftover: Buffer<ArrayBuffer> = Buffer.alloc(0);

            const result: Token = {
                $name: "root",
                $value: null,
                $attribute: null,
                $position: {
                    open: 0,
                    close: -1
                }
            }


            this.RESULT_TREE_HASH_MAP.set("root", [result]);

            let globalIndexPosition: number = 0;

            stream.on("data", (chunk: Buffer<ArrayBuffer>): void => {
                const chunkCombinedWithLeftover: Buffer<ArrayBuffer> = Buffer.concat([bufferLeftover, chunk]);

                let securityBytesBuffer: number = 0;

                XmlTreeTraverser.dfs(this.WATCHED_XML_TAG_TREE, (node: XmlTreeNode, path: string): void => {
                    const {original, type, open, close}: RawBinaryXmlTagPair = node.data;

                    let observedChunk: Buffer<ArrayBuffer> = chunkCombinedWithLeftover;
                    let subtractedChunkBytes: number = 0;

                    let openTagIndex: number = 0;
                    let closeTagIndex: number = 0;

                    let attribute: Buffer<ArrayBuffer> = Buffer.alloc(0);

                    // The parser try to find all occurrences of the current tag
                    while(openTagIndex !== -1) {
                        openTagIndex = observedChunk.indexOf(open);
                        closeTagIndex = observedChunk.indexOf(close);

                        // Open and close tag found in the observable chunk
                        if (openTagIndex !== -1 && closeTagIndex !== -1) {
                            // The closing tag index is greater than opening tag
                            // meaning that is a closing tag from another chunk
                            if(closeTagIndex < openTagIndex) {
                                this.closeOpenNode(path, closeTagIndex + globalIndexPosition);

                                const currentObservedChunkBytes: number = observedChunk.byteLength;

                                observedChunk = observedChunk.subarray(
                                    closeTagIndex + close.byteLength,
                                    chunkCombinedWithLeftover.byteLength
                                );

                                subtractedChunkBytes = this.calculateSubtractedChunkBytes(
                                    subtractedChunkBytes,
                                    currentObservedChunkBytes,
                                    observedChunk.byteLength
                                );

                                continue;
                            }

                            if(type !== XML_NODE_TYPE) {
                                const rawBinaryValue: Buffer<ArrayBuffer> = observedChunk.subarray(
                                    openTagIndex + open.byteLength + 1,
                                    closeTagIndex
                                );

                                const result: Token = this.createResultNode(
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

                                subtractedChunkBytes = this.calculateSubtractedChunkBytes(
                                    subtractedChunkBytes,
                                    currentObservedChunkBytes,
                                    observedChunk.byteLength
                                );

                                continue;
                            }

                            //Check if open tag has attributes on it
                            if (observedChunk.at(openTagIndex + open.byteLength) != XML.GT_TAG.at(0)) {
                                let attributesPointer: number = openTagIndex + open.byteLength + 1;

                                while(true) {
                                    if (observedChunk.at(attributesPointer) == XML.GT_TAG.at(0)) {
                                        break;
                                    }

                                    const value: Buffer<ArrayBuffer> = Buffer.from([
                                        observedChunk.at(attributesPointer)!
                                    ]);

                                    attribute = Buffer.concat([attribute, value])

                                    attributesPointer++;
                                }
                            }

                            const result: Token = this.createResultNode(
                                original,
                                openTagIndex + globalIndexPosition + subtractedChunkBytes,
                                closeTagIndex + globalIndexPosition + subtractedChunkBytes,
                                null,
                                attribute.length? attribute.toString(UTF_8_ENCODING) : null,
                            )

                            this.registerNewNode(path, result);

                            this.append(path, result);

                            const currentObservedChunkBytes: number = observedChunk.byteLength;

                            observedChunk = observedChunk.subarray(
                                closeTagIndex + close.byteLength,
                                chunkCombinedWithLeftover.byteLength
                            );

                            subtractedChunkBytes = this.calculateSubtractedChunkBytes(
                                subtractedChunkBytes,
                                currentObservedChunkBytes,
                                observedChunk.byteLength
                            );

                            continue;
                        }

                        // Only open tag found in the observed chunk
                        if (openTagIndex !== -1) {
                            if(type !== XML_NODE_TYPE) {
                                securityBytesBuffer = chunk.byteLength - (openTagIndex + subtractedChunkBytes);

                                break;
                            }

                            //Check if open tag has attributes on it
                            if (observedChunk.at(openTagIndex + open.byteLength) != XML.GT_TAG.at(0)) {
                                let attributesPointer: number = openTagIndex + open.byteLength + 1;

                                while(true) {
                                    if (observedChunk.at(attributesPointer) == XML.GT_TAG.at(0)) {
                                        break;
                                    }

                                    const value: Buffer<ArrayBuffer> = Buffer.from([
                                        observedChunk.at(attributesPointer)!
                                    ]);

                                    attribute = Buffer.concat([attribute, value])

                                    attributesPointer++;
                                }
                            }

                            const result: Token = this.createResultNode(
                                original,
                                openTagIndex + globalIndexPosition + subtractedChunkBytes,
                                closeTagIndex === -1 ? -1 : closeTagIndex + globalIndexPosition + subtractedChunkBytes,
                                null,
                                attribute.length? attribute.toString(UTF_8_ENCODING) : null,
                            );

                            this.registerNewNode(path, result);

                            this.append(path, result);

                            const currentObservedChunkBytes: number = observedChunk.byteLength;

                            observedChunk = observedChunk.subarray(
                                openTagIndex + open.byteLength,
                                chunkCombinedWithLeftover.byteLength
                            );

                            subtractedChunkBytes = this.calculateSubtractedChunkBytes(
                                subtractedChunkBytes,
                                currentObservedChunkBytes,
                                observedChunk.byteLength
                            );
                        }
                    }
                });

                const start: number = chunkCombinedWithLeftover.byteLength - securityBytesBuffer;

                bufferLeftover = chunkCombinedWithLeftover.subarray(start, chunkCombinedWithLeftover.length);

                globalIndexPosition = globalIndexPosition + chunk.byteLength;
            });

            stream.on("end", (): void => resolve(result));

            stream.on("error", (error: Error): void => {
                reject(error);
            });
        });
    }

    /**
     * Append the result node to the correct parent in the result tree
     * @param path current level from the instructions tree
     * @param node ResultTreeNode
     * @returns void
     */
    private append(path: string, node: Token): void {
        const parentLvlKey: string = path.substring(0, path.lastIndexOf("/"));

        //The hash map allows to avoid the traverse of the hole result tree
        const parents: Token[] | undefined = this.RESULT_TREE_HASH_MAP.get(parentLvlKey !== ""? parentLvlKey : "root");

        if (!parents) {
            throw new NodeParentNotFoundError(parentLvlKey);
        }

        //The node closing tag has not been found in the current chunk
        //so checking for inRange nodes will lead to false positives
        if (node.$position.close === -1) {
            for (let i: number = 0; i < parents.length; i++) {
                const parent: Token = parents[i]!;

                if (parent.$position.close === -1) {
                   this.addLeafToPojo(parent, node);

                   break;
                }
            }

            return;
        }

        for (let i: number = 0; i < parents.length; i++) {
            const parent: Token = parents[i]!;

            if (parent.$position.close === -1) {
                this.addLeafToPojo(parent, node);

                break;
            }

            if (isInRange(parent, node.$position.open, node.$position.close)) {
                this.addLeafToPojo(parent, node);

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
        const nodes: Token[] = this.RESULT_TREE_HASH_MAP.get(path)!;

        // The first item found with closing tag -1 is the correct one since the parser is going top down and the
        // items are being inserted in the hash map in order as the parser founds them
        for (let i: number = 0; i < nodes.length; i++) {
            const node: Token = nodes[i]!;

            if (node.$position.close === -1) {
                node.$position.close = closeIndexPosition;

                break;
            }
        }
    }

    /**
     * Register a node in the hash map
     * @param path current level from the instructions tree
     * @param node Result
     * @returns void
     */
    private registerNewNode(path: string, node: Token): void {
        const nodes: Token[] | undefined = this.RESULT_TREE_HASH_MAP.get(path);

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
     * @returns Token
     */
    private createResultNode(
        tagName: string,
        open: number,
        close: number,
        value: string | number | null = null,
        attribute: string | null = null,
    ): Token {
        return {
            $name: tagName,
            $value: value,
            $attribute: attribute,
            $position: {open, close},
        };
    }

    /**
     * Calculate new value for subtracted chunk bytes counter
     * @param alreadySubtractedBytes Sum of already subtracted bytes of the same chunk
     * @param currentObservedChunkByteLength Byte length of the current observed chunk
     * @param cutChunkByteLength Byte length of the new subarray that has been promoted to observed chunk
     * @returns number
     */
    private calculateSubtractedChunkBytes(
        alreadySubtractedBytes: number,
        currentObservedChunkByteLength: number,
        cutChunkByteLength: number
    ): number {
        return alreadySubtractedBytes + (currentObservedChunkByteLength - cutChunkByteLength);
    }

    /**
     * Add a new prop to a plain javascript object respecting array or obj
     * @param parent Result the parent node
     * @param node Result the current node
     * @returns void
     */
    private addLeafToPojo(parent: Token, node: Token): void {
        if (Object.hasOwn(parent, node.$name)) {
            if (Array.isArray(parent[node.$name])) {
                parent[node.$name].push(node);

                return;
            }

            parent[node.$name] = [parent[node.$name], node];

            return;
        }

        parent[node.$name] = node;
    }
}