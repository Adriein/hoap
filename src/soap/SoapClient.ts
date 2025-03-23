/*
 * Copyright (c) 2025 Adria Claret <adria.claret@gmail.com>
 * MIT Licensed
 */

import {JsonXmlBodyStruct, Token} from "@shared/Types";
import {SoapHttps} from "@soap/SoapHttps";
import {JsonToXmlTransformer} from "@soap/JsonToXmlTransformer";

export class SoapClient {
    private readonly transformer: JsonToXmlTransformer;

    public static instance(url: string, https: SoapHttps): SoapClient {
        return new SoapClient(url, https);
    }

    private constructor(
        private readonly url: string,
        private readonly https: SoapHttps,
        private readonly soapHeaders: JsonXmlBodyStruct[] = [],
        private readonly httpHeaders: Record<string, string> = {},
        private body: string = "",
    ) {
        this.transformer = new JsonToXmlTransformer()
    }

    public addHttpHeader(key: string, value: string): SoapClient {
        this.httpHeaders[key] = value;

        return this;
    }

    public addSoapHeader(header: JsonXmlBodyStruct): SoapClient {
        this.soapHeaders.push(header);

        return this;
    }

    public withBody(body: JsonXmlBodyStruct): SoapClient {
        this.body = this.buildRequest(body)
            .replace(/[\n\r]/g, '')
            .replace(/>\s+</g, '><') // Remove spaces between tags
            .replace(/\s+/g, ' ') // Replace multiple spaces with a single space
            .trim();

        return this;
    }

    public async makeRequest(): Promise<Token> {
        return await this.https.do(this.url, this.body, { header: this.httpHeaders });
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