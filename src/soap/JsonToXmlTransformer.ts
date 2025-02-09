import {JsonXmlBodyStruct} from "@shared/Types";
import {XmlTransformerError} from "@soap/Error/XmlTransformerError";

export class JsonToXmlTransformer {
    public execute({tag, value, children, attributes}: JsonXmlBodyStruct): string {
        if (!tag) {
            throw XmlTransformerError.noTag();
        }

        const openingTag = attributes?.length
            ? `<${tag} ${attributes.join(" ")}>`
            : `<${tag}>`;

        const closingTag = `</${tag}>`;

        if (!children?.length && !value && typeof value === "string") {
            return openingTag.replace(">", "/>");
        }

        if (!children?.length) {
            return `${openingTag}${value}${closingTag}`;
        }


        const childrenXml: string = children.map((child: JsonXmlBodyStruct): string => this.execute(child)).join("\n");

        return `
            ${openingTag}
                ${childrenXml}
            ${closingTag}
        `;
    }
}