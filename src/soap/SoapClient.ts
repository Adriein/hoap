/*
 * Copyright (c) 2025 Adria Claret <adria.claret@gmail.com>
 * MIT Licensed
 */

import {JsonXmlBodyStruct, Result} from "@shared/Types";
import {SoapHttps} from "@soap/SoapHttps";
import {JsonToXmlTransformer} from "@soap/JsonToXmlTransformer";

export class SoapClient {
    public static instance(url: string, https: SoapHttps, transformer: JsonToXmlTransformer): SoapClient {
        return new SoapClient(url, https, transformer);
    }

    private constructor(
        private readonly url: string,
        private readonly https: SoapHttps,
        private readonly transformer: JsonToXmlTransformer,
        private readonly soapHeaders: JsonXmlBodyStruct[] = [],
        private readonly httpHeaders: Record<string, string> = {},
    ) {}

    public addHttpHeader(key: string, value: string): SoapClient {
        this.httpHeaders[key] = value;

        return this;
    }

    public addSoapHeader(header: JsonXmlBodyStruct): SoapClient {
        this.soapHeaders.push(header);

        return this;
    }

    public async execute(body: JsonXmlBodyStruct): Promise<Result> {
        const xmlBody: string = this.buildRequest(body)
            .replace(/[\n\r]/g, '')
            .replace(/>\s+</g, '><') // Remove spaces between tags
            .replace(/\s+/g, ' ') // Replace multiple spaces with a single space
            .trim();

        return await this.https.do(this.url, xmlBody);
    }

    private buildRequest(jsonFormatBody: JsonXmlBodyStruct): string {
        const header: string = this.soapHeaders.length?
            `<soap:Header>
                ${this.soapHeaders.map((h: JsonXmlBodyStruct): string => this.transformer.execute(h)).join("\n")}
             </soap:Header>` :
            "";

        return `
            <?xml version="1.0" encoding="utf-8"?>
            <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
                ${header}
                <soap:Body>
                    ${this.transformer.execute(jsonFormatBody)}
                </soap:Body>
            </soap:Envelope>
        `;
    }
}