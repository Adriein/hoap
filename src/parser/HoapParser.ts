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
import {ParserTask, ParserTaskType, RawBinaryXmlTagPair, Token} from "@shared/Types";
import {isInRange} from "@parser/Shared/Utils";
import {NodeParentNotFoundError} from "@parser/Shared/Error/NodeParentNotFoundError";
import {Tokenizer} from "@parser/Tokenizer";

export class HoapParser {
    private readonly WATCHED_XML_TAG_TREE: XmlTreeNode;
    private readonly RESULT_TREE_HASH_MAP: Map<string, Token[]> = new Map<string, Token[]>();

    public constructor(private config: ParserConfig) {
        if (!config.configFile) {
            throw ParserConfigError.noConfigFile()
        }

        this.WATCHED_XML_TAG_TREE = InstructionTreeBuilder.fromHoapConfigJson(config.configFile);
    }

    public parse(stream: Readable): Promise<Token> {
        return new Promise((resolve: (json: Token) => void, reject: (error: Error) => void): void => {
            const debugData: string[] = [];
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

            let bufferLeftover: Buffer<ArrayBuffer> = Buffer.alloc(0);
            let globalStdPointer: number = 0;

            stream.on(NODE_STREAM_DATA_EVENT, (chunk: Buffer<ArrayBuffer>): void => {
                if (this.config.debugMode) {
                    debugData.push(chunk.toString(UTF_8_ENCODING));
                }

                const combinedChunk: Buffer<ArrayBuffer> = Buffer.concat([bufferLeftover, chunk]);

                let securityBytesBuffer: number = 0;

                XmlTreeTraverser.dfs(this.WATCHED_XML_TAG_TREE, (node: XmlTreeNode, path: string): void => {
                    const {original, type, open, close}: RawBinaryXmlTagPair = node.data;

                    let stdReadPointer: number = 0;

                    const tasks: ParserTask[] = [
                        {type: ParserTaskType.OPEN, tag: open},
                        {type: ParserTaskType.CLOSE, tag: close}
                    ];

                    // The parser try to find all occurrences of the current tag
                    while(tasks.length > 0) {
                        const task: ParserTask | undefined = tasks.shift();

                        if (!task) {
                            break;
                        }

                        const currentTag: Buffer<ArrayBuffer> = task.tag;

                        stdReadPointer = 0;

                        const tagBitmask: number = currentTag.readInt32LE();

                        while(stdReadPointer <= chunk.byteLength) {
                            if (stdReadPointer + 32 > chunk.byteLength) {
                                break;
                            }

                            const stream32BitLeChunk: number = combinedChunk.readInt32LE(stdReadPointer);

                            if (stream32BitLeChunk ^ tagBitmask) {
                                stdReadPointer++;

                                continue;
                            }

                            const byteLength: number = task.type === ParserTaskType.OPEN?
                                task.tag.byteLength :
                                task.tag.byteLength - 1;

                            const char: number = combinedChunk[stdReadPointer + byteLength]!;

                            if (Tokenizer.isFalsePositive(char)) {
                                stdReadPointer = stdReadPointer + open.byteLength;

                                tasks.unshift(task);

                                continue;
                            }

                            if (task.type === ParserTaskType.OPEN) {
                                const result: Token = Tokenizer.openToken(original, stdReadPointer + globalStdPointer);

                                this.registerNewNode(path, result);

                                this.append(path, result);

                                stdReadPointer += 1;

                                continue;
                            }

                            console.log(combinedChunk.subarray(0, stdReadPointer + task.tag.byteLength).toString())

                            this.closeOpenNode(path, stdReadPointer + globalStdPointer);

                            stdReadPointer += 1;
                        }
                    }
                });

                const start: number = combinedChunk.byteLength - securityBytesBuffer;

                bufferLeftover = combinedChunk.subarray(start, combinedChunk.length);

                globalStdPointer += chunk.byteLength;
            });

            stream.on(NODE_STREAM_END_EVENT, (): void => {
                if (this.config.debugMode) {
                    console.log(debugData)
                }

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
}