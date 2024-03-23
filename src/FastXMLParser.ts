import {XMLParser} from "fast-xml-parser";

export default class FastXMLParser {
    public async parse(rawXML: string): Promise<void> {
        const parser: XMLParser = new XMLParser();

        const result = parser.parse(rawXML);

        console.log(result['soap:Envelope']['soap:Body']);
    }
}