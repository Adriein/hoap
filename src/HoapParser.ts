import {XMLParser} from "fast-xml-parser";

export default class HoapParser {

    private readonly INIT_NEEDLE: string = '<?xml version="1.0" encoding="UTF-8"?>'

    public async parse(rawXML: string): Promise<void> {
        let pointer: number = rawXML.indexOf(this.INIT_NEEDLE);
        let indentation: number = 0;
        let char = null;

        const openTagCharCode: number = "<".charCodeAt(0);
        const closeTagCharCode: number = ">".charCodeAt(0);
        const spaceCharCode: number = " ".charCodeAt(0);

        pointer = pointer + this.INIT_NEEDLE.length;

        const tagChars: string[] = [];

        while((char = rawXML.charCodeAt(pointer)) !== spaceCharCode) {
            if(char === openTagCharCode) {
                pointer ++;

                continue;
            }

            tagChars.push(String.fromCharCode(char));

            pointer ++;
        }

        console.log(tagChars.join(''))

        const result: Record<string, any> = { Body: {} };



    }
}