/*
 * Copyright (c) 2024 Adria Claret <adria.claret@gmail.com>
 * MIT Licensed
 */

import {Readable} from "node:stream";
import {ParserConfig} from "@parser/ParserConfig";
import {InstructionTreeBuilder} from "@parser/Shared/Builder";
import {
    NODE_STREAM_DATA_EVENT,
    NODE_STREAM_END_EVENT,
    NODE_STREAM_ERROR_EVENT,
    UTF_8_ENCODING,
    XML,
    XML_NODE_TYPE
} from "@shared/Constants";
import {ParserConfigError} from "@parser/Shared/Error";
import {XmlTreeNode, XmlTreeTraverser} from "@parser/Shared/Tree";
import {RawBinaryXmlTagPair, Result} from "@shared/Types";
import {isInRange} from "@parser/Shared/Utils";
import {NodeParentNotFoundError} from "@parser/Shared/Error/NodeParentNotFoundError";

export class HoapParser {
    private readonly WATCHED_XML_TAG_TREE: XmlTreeNode;
    private readonly RESULT_TREE_HASH_MAP: Map<string, Result[]> = new Map<string, Result[]>();

    public constructor(config: ParserConfig) {
        if (!config.configFile) {
            throw ParserConfigError.noConfigFile()
        }

        this.WATCHED_XML_TAG_TREE = InstructionTreeBuilder.fromHoapConfigJson(config.configFile);
    }

    public parse(stream: Readable): Promise<Result> {
        return new Promise((resolve: (json: Result) => void, reject: (error: Error) => void): void => {
            const result: Result = {
                $name: "root",
                $value: null,
                $attribute: null,
                $position: {
                    open: 0,
                    close: -1
                }
            }

            this.RESULT_TREE_HASH_MAP.set("root", [result]);

            let bufferLeftover: Buffer<ArrayBuffer> = Buffer.alloc(0);
            let globalStdPointer: number = 0;

            stream.on(NODE_STREAM_DATA_EVENT, (chunk: Buffer<ArrayBuffer>): void => {
                const combinedChunk: Buffer<ArrayBuffer> = Buffer.concat([bufferLeftover, chunk]);

                let securityBytesBuffer: number = 0;

                XmlTreeTraverser.dfs(this.WATCHED_XML_TAG_TREE, (node: XmlTreeNode, path: string): void => {
                    const {original, type, open, close}: RawBinaryXmlTagPair = node.data;

                    let chunkOpenPointer: number = 0;
                    let chunkClosePointer: number = 0;

                    // The parser try to find all occurrences of the current tag
                    while(true) {
                        const openTagIndex: number = combinedChunk.indexOf(open, chunkOpenPointer);
                        const closeTagIndex: number = combinedChunk.indexOf(close, chunkClosePointer);

                        // Open and close tag found in the observable chunk
                        if (openTagIndex !== -1 && closeTagIndex !== -1) {
                            const char: number = combinedChunk[openTagIndex + open.byteLength]!;

                            if(this.isFalsePositive(char)) {
                                chunkOpenPointer = openTagIndex + open.byteLength;

                                continue;
                            }

                            // The closing tag index is greater than opening tag
                            // meaning that is a closing tag from another chunk
                            if(closeTagIndex < openTagIndex) {
                                this.closeOpenNode(path, closeTagIndex + globalStdPointer);

                                chunkClosePointer = closeTagIndex + close.byteLength;

                                continue;
                            }

                            if(type !== XML_NODE_TYPE) {
                                const rawBinaryValue: Buffer<ArrayBuffer> = combinedChunk.subarray(
                                    openTagIndex + open.byteLength + 1,
                                    closeTagIndex
                                );

                                const result: Result = this.createResultNode(
                                    original,
                                    openTagIndex + globalStdPointer,
                                    closeTagIndex + globalStdPointer,
                                    rawBinaryValue.toString(UTF_8_ENCODING)
                                )

                                this.registerNewNode(path, result);

                                this.append(path, result);

                                chunkOpenPointer = closeTagIndex + close.byteLength;
                                chunkClosePointer = closeTagIndex + close.byteLength;

                                continue;
                            }

                            const attribute: Buffer<ArrayBuffer> = this.extractAttributes(
                                combinedChunk,
                                openTagIndex,
                                open
                            );

                            const result: Result = this.createResultNode(
                                original,
                                openTagIndex + globalStdPointer,
                                closeTagIndex + globalStdPointer,
                                null,
                                attribute.length? attribute.toString(UTF_8_ENCODING) : null,
                            )

                            this.registerNewNode(path, result);

                            this.append(path, result);

                            chunkOpenPointer = closeTagIndex + close.byteLength;
                            chunkClosePointer = closeTagIndex + close.byteLength;

                            continue;
                        }

                        // Only open tag found in the observed chunk
                        if (openTagIndex !== -1) {
                            const char: number = combinedChunk[openTagIndex + open.byteLength]!;

                            if(this.isFalsePositive(char)) {
                                chunkOpenPointer = openTagIndex + open.byteLength;

                                continue;
                            }

                            if(type !== XML_NODE_TYPE) {
                                securityBytesBuffer = combinedChunk.byteLength - openTagIndex;

                                break;
                            }

                            const attribute: Buffer<ArrayBuffer> = this.extractAttributes(
                                combinedChunk,
                                openTagIndex,
                                open
                            );

                            const result: Result = this.createResultNode(
                                original,
                                openTagIndex + globalStdPointer,
                                -1,
                                null,
                                attribute.length? attribute.toString(UTF_8_ENCODING) : null,
                            );

                            this.registerNewNode(path, result);

                            this.append(path, result);

                            break;
                        }

                        break;
                    }
                });

                const start: number = combinedChunk.byteLength - securityBytesBuffer;

                bufferLeftover = combinedChunk.subarray(start, combinedChunk.length);

                globalStdPointer += chunk.byteLength;
            });

            stream.on(NODE_STREAM_END_EVENT, (): void => {
                result.$position.close = globalStdPointer;
                resolve(result);
            });

            stream.on(NODE_STREAM_ERROR_EVENT, (error: Error): void => {
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
    private append(path: string, node: Result): void {
        const parentLvlKey: string = path.substring(0, path.lastIndexOf("/"));

        //The hash map allows to avoid the traverse of the hole result tree
        const parents: Result[] | undefined = this.RESULT_TREE_HASH_MAP.get(parentLvlKey !== ""? parentLvlKey : "root");

        if (!parents) {
            throw new NodeParentNotFoundError(parentLvlKey);
        }

        //The node closing tag has not been found in the current chunk
        //so checking for inRange nodes will lead to false positives
        if (node.$position.close === -1) {
            for (let i: number = 0; i < parents.length; i++) {
                const parent: Result = parents[i]!;

                if (parent.$position.close === -1) {
                    this.addLeafToPojo(parent, node);

                    break;
                }
            }

            return;
        }

        for (let i: number = 0; i < parents.length; i++) {
            const parent: Result = parents[i]!;

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
        const nodes: Result[] = this.RESULT_TREE_HASH_MAP.get(path)!;

        // The first item found with closing tag -1 is the correct one since the parser is going top down and the
        // items are being inserted in the hash map in order as the parser founds them
        for (let i: number = 0; i < nodes.length; i++) {
            const node: Result = nodes[i]!;

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
    private registerNewNode(path: string, node: Result): void {
        const nodes: Result[] | undefined = this.RESULT_TREE_HASH_MAP.get(path);

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
     * @param attribute
     * @returns Result
     */
    private createResultNode(
        tagName: string,
        open: number,
        close: number,
        value: string | number | null = null,
        attribute: string | null = null,
    ): Result {
        return {
            $name: tagName,
            $value: value,
            $attribute: attribute,
            $position: {open, close},
        };
    }

    /**
     * Add a new prop to a plain javascript object respecting array or obj
     * @param parent Result the parent node
     * @param node Result the current node
     * @returns void
     */
    private addLeafToPojo(parent: Result, node: Result): void {
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

    /**
     * Extract attributes from opening XML tag
     * @returns Buffer<ArrayBuffer>
     * @param chunk
     * @param openTagIndex
     * @param open
     */
    private extractAttributes(
        chunk: Buffer<ArrayBuffer>,
        openTagIndex: number,
        open: Buffer<ArrayBuffer>
    ): Buffer<ArrayBuffer> {
        // Calculate the starting position for attributes
        const attributeStart: number = openTagIndex + open.length;

        // If the next character after the open tag is '>', return an empty buffer
        if (chunk[attributeStart] === XML.GT_TAG[0]) {
            return Buffer.alloc(0);
        }

        // For smaller amount of bytes it is more efficient than Buffer.alloc
        const attributeBytes: number[] = [];

        // Iterate through the chunk starting from the attributes position
        for (let i: number = attributeStart + 1; i < chunk.length; i++) {
            if (chunk[i] === XML.GT_TAG[0]) {
                break; // Stop when we encounter the closing '>'
            }

            attributeBytes.push(chunk[i]!);
        }

        return Buffer.from(attributeBytes);
    }

    private isFalsePositive(char: number): boolean {
        return (char !== XML.GT_TAG[0]) && (char !== XML.BLANK_SPACE[0]);
    }
}