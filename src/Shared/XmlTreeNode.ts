/*
 * Copyright (c) 2024 Adria Claret <adria.claret@gmail.com>
 * MIT Licensed
 */

import {RawBinaryXmlTagPair, WatchedXmlTagNode, WatchedXmlTagsJson} from "./types";
import {UTF_8_ENCODING, XmlTreeNodeStatus} from "./constants";

export class XmlTreeNode {
    /**
     * Creates an XML tree from a JSON configuration
     * @param json The JSON configuration containing the XML structure
     * @throws Error if the JSON is invalid or empty
     * @returns The root node of the XML tree
     * @example
     *  // Example: XmlTreeNode data structure
     *  {
     *      original: "recommendation",
     *      open: "<recommendation>"
     *      close: "</recommendation>"
     *  };
     */
    public static fromHoapConfigJson(json: WatchedXmlTagsJson): XmlTreeNode {
        if (!json.nodes?.length) {
            throw new Error('Invalid or empty JSON configuration');
        }

        const rootTagNode: WatchedXmlTagNode = json.nodes[0]!;
        const rootNode = new XmlTreeNode(this.createXmlTagPair(rootTagNode.name, rootTagNode.type));

        if (rootTagNode.children?.length) {
            this.buildChildren(rootNode, rootTagNode.children);
        }

        return rootNode;
    }

    /**
     * Creates a RawBinaryXmlTagPair from a tag name
     * @param tagName The name of the XML tag
     * @param type The type of the node defined by user (xml-node, xml-data)
     * @returns A RawBinaryXmlTagPair containing the binary representations of the tags
     */
    private static createXmlTagPair(tagName: string, type: string): RawBinaryXmlTagPair {
        const xmlOpenTag = `<${tagName}>`;
        const xmlClosingTag = `</${tagName}>`;

        return {
            original: tagName,
            open: Buffer.from(xmlOpenTag, UTF_8_ENCODING),
            close: Buffer.from(xmlClosingTag, UTF_8_ENCODING),
            type: type,
        };
    }

    /**
     * Recursively builds child nodes for a given parent node
     * @param parent The parent node to add children to
     * @param children Array of child node configurations
     */
    private static buildChildren(parent: XmlTreeNode, children: WatchedXmlTagNode[]): void {
        for (let i: number = 0; i < children.length; i++) {
            const child: WatchedXmlTagNode = children[i]!;
            const node = new XmlTreeNode(this.createXmlTagPair(child.name, child.type));
            parent.addChild(node);

            if (child.children?.length) {
                this.buildChildren(node, child.children);
            }
        }
    }

    public constructor(
        private _data: RawBinaryXmlTagPair,
        private _children: XmlTreeNode[] = []
    ) {}

    public get data(): RawBinaryXmlTagPair {
        return this._data;
    }

    public get children(): XmlTreeNode[] {
        return this._children;
    }

    public addChild(node: XmlTreeNode): void {
        this._children.push(node);
    }
}