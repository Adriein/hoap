/*
 * Copyright (c) 2025 Adria Claret <adria.claret@gmail.com>
 * MIT Licensed
 */

import { request } from 'node:https';
import { ClientRequest, IncomingMessage} from "node:http";
import {SoapRequest, SoapRequestAbortFn} from "@soap/Shared/Types";
import {HoapParser} from "@parser/HoapParser";
import {Result} from "@parser/Shared/Types";

export class Https {
    public do(host: string, parser: HoapParser): SoapRequest {
        const options = {
            hostname: host,
            method: 'POST',
            headers: { 'Content-Type': 'text/xml; charset=utf-8' }
        };

        let client: ClientRequest | null = null;

        const promise = new Promise<Result>((resolve: (data: Result) => void, reject: (error: Error) => void): void => {
            client = request(options, (readable: IncomingMessage): void => {
                parser.parse(readable)
                    .then((data: Result): void => resolve(data))
                    .catch((error: Error): void => reject(error));
            });

            client.write(this.buildRequest());
            client.end();
        });

        const abort: SoapRequestAbortFn = (): void => {
            if (!client) {
                return;
            }

            client.destroy();
        };

        return { promise, abort };
    }
    private buildRequest(): Buffer<ArrayBuffer> {
        throw new Error("Not implemented");
    }
}