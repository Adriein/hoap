import {JsonXmlBodyStruct} from "@shared/Types";

export class JsonToXmlTransformer {
    public execute({tag, value, children, attributes}: JsonXmlBodyStruct): string {
        // Since is the last node it should always have a value
        if (!children.length) {
            if (attributes.length) {
                return `
                    <${tag} ${attributes.join(" ")}>${value}</${tag}>
                `;
            }

            return `
                <${tag}>${value}</${tag}>
            `;
        }

        if (attributes.length) {
            return `
                <${tag} ${attributes.join(" ")}>
                    ${this.execute(children[0]!)}
                </${tag}>
            `;
        }

        return `
            <${tag}>
                ${this.execute(children[0]!)}
            </${tag}>
        `;
    }
}