import {JsonXmlBodyStruct} from "@shared/Types";

export class JsonToXmlTransformer {
    public execute({tag, value, children, attributes}: JsonXmlBodyStruct): string {
        if (!tag) {
            throw new Error("Tag is required.");
        }

        const openingTag = attributes.length
            ? `<${tag} ${attributes.join(" ")}>`
            : `<${tag}>`;

        const closingTag = `</${tag}>`;

        if (!children.length) {
            return `${openingTag}${value}${closingTag}`;
        }

        const childrenXml: string = children.map((child: JsonXmlBodyStruct): string => this.execute(child)).join("");

        return `
            ${openingTag}
                ${childrenXml}
            ${closingTag}
        `;
    }
}