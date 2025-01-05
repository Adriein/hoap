type AST_Node = { name: string, value: string | number | null, children: AST_Node[] };

enum PARSER_MODE {
    READ = 0,
    IGNORE = 1,
}

enum PARSING {
    TAG = 0,
    VALUE = 1
}

export default class ParserV0 {

    private readonly INIT_NEEDLE: string = '<?xml version="1.0" encoding="UTF-8"?>';
    //private readonly MAX_NEEDLE: string = '</soap:Envelope>';
    // private readonly MAX_NEEDLE: string = '</soap:Header>';
    private readonly MAX_NEEDLE: string = '<wsa:Action>';

    private readonly XML = {
        'OPEN_TAG_CHAR_CODE': "<".charCodeAt(0),
        'CLOSE_TAG_CHAR_CODE': ">".charCodeAt(0),
        'SPACE_TAG_CHAR_CODE': " ".charCodeAt(0),
        'RETURN_TAG_CHAR_CODE': "\r".charCodeAt(0),
        'LINE_END_TAG_CHAR_CODE': "\n".charCodeAt(0),
        'CLOSE_TAG_SLASH_CHAR_CODE': "/".charCodeAt(0)
    }

    public async parse(rawXML: string): Promise<void> {
        const initialPointer: number = rawXML.indexOf(this.INIT_NEEDLE) + this.INIT_NEEDLE.length;
        const maxPointer: number = rawXML.indexOf(this.MAX_NEEDLE);

        let currentNode: AST_Node | null = null;
        let previousNode: AST_Node | null = null;

        let status: PARSER_MODE = PARSER_MODE.READ;
        let char = null;

        let tagChars: string[] = [];

        const AST: AST_Node[] = [];

        for(let pointer: number = initialPointer; pointer < maxPointer; pointer++) {
            char = rawXML.charCodeAt(pointer);

            /** Ignore "\r" and "\n" characters */
            if (char === this.XML.LINE_END_TAG_CHAR_CODE || char === this.XML.RETURN_TAG_CHAR_CODE) {
                continue;
            }

            /** On "<" change parser to read mode and ignore character */
            if(char === this.XML.OPEN_TAG_CHAR_CODE) {
                status = PARSER_MODE.READ;

                if (rawXML.charCodeAt(pointer + 1) === this.XML.CLOSE_TAG_SLASH_CHAR_CODE) {
                    currentNode!.value = this.extractValue(tagChars);

                    currentNode = previousNode;

                    status = PARSER_MODE.IGNORE;

                    tagChars = [];

                    continue;
                }

                continue;
            }

            /** On space, we consider we found an attribute, we want to ignore the entire attribute */
            if (char === this.XML.SPACE_TAG_CHAR_CODE) {
                status = PARSER_MODE.IGNORE;

                continue;
            }

            /** On ">" change parser to read mode and create AST node for tag value*/
            if (char === this.XML.CLOSE_TAG_CHAR_CODE) {
                status = PARSER_MODE.READ;

                const node: AST_Node | null = this.createASTNode(tagChars);

                if (!node) {
                    tagChars = [];

                    continue;
                }

                if (currentNode) {
                    currentNode.children.push(node);

                    previousNode = currentNode;
                    currentNode = node;

                    tagChars = [];

                    continue;
                }

                AST.push(node);

                currentNode = node;

                tagChars = [];

                continue;
            }

            if(status !== PARSER_MODE.READ) {
                continue;
            }

            tagChars.push(String.fromCharCode(char));
        }

        const result: any = {};

        const queue: AST_Node[] = [AST[0]!];

        while (queue.length) {
            const node: AST_Node | undefined = queue.shift();

            if (node) {
                console.log(`Tag: ${node.name}`);
                console.log(`Value: ${node.value}`);
                console.log(`Children number: ${node.children.length}`);

                node.children.forEach(childrenNode => queue.push(childrenNode));
            }
        }
    }

    private createASTNode(tagChars: string[]): AST_Node | null {
        const tag: string = tagChars.join('');

        if (!tag) {
            return null;
        }

        return { name: tag, value: null, children: [] }
    }

    private extractValue(tagChars: string[]): string | null {
        const tag: string = tagChars.join('');

        if (!tag) {
            return null;
        }

        return tag;
    }
}