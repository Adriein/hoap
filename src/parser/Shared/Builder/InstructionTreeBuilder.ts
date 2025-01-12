import {RawBinaryXmlTagPair, WatchedXmlTagNode, WatchedXmlTagsJson} from "@shared/Types";
import {UTF_8_ENCODING} from "@shared/Constants";
import {XmlTreeNode} from "@parser/Shared/Tree/XmlTreeNode";

export class InstructionTreeBuilder {
    public static HASH_MAP_KEYS: string[] = ["root"];
    private static TMP_BUILD_PATH_STORE: string[] = ["root"];
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
        const xmlOpenTag = `<${tagName}`;
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
        if (!children?.length) {
            this.TMP_BUILD_PATH_STORE.pop();
        }

        for (let i: number = 0; i < children.length; i++) {
            const child: WatchedXmlTagNode = children[i]!;
            const node = new XmlTreeNode(this.createXmlTagPair(child.name, child.type));
            parent.addChild(node);

            this.TMP_BUILD_PATH_STORE.push(child.name);

            this.HASH_MAP_KEYS.push(this.TMP_BUILD_PATH_STORE.join("/"));

            if (!child.children?.length) {
                this.TMP_BUILD_PATH_STORE.pop();

                continue;
            }

            this.buildChildren(node, child.children);
        }

        this.TMP_BUILD_PATH_STORE.pop();
    }
}