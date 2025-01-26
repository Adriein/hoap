/*
 * Copyright (c) 2025 Adria Claret <adria.claret@gmail.com>
 * MIT Licensed
 */

import { request, RequestOptions } from 'node:https';
import { ClientRequest, IncomingMessage} from "node:http";
import {Result, SoapHttpOptions, SoapRequest, SoapRequestAbortFn} from "@shared/Types";
import {HoapParser} from "@parser/HoapParser";
import {HTTP_STATUS} from "@shared/Constants";
import { Socket } from 'node:net';
import {HttpError} from "@soap/Error/HttpError";

export class Https {
    private DEFAULT_TIMEOUT: number = 60_000;

    public constructor(
        private parser: HoapParser,
    ) {}

    public do(url: string, options?: SoapHttpOptions): Promise<Result> {
        const [host, ...path] = url.split("/");

        const nodeStdHttpOptions: RequestOptions = {
            hostname: host,
            path: `/${path.join("/")}`,
            method: 'POST',
            headers: { 'Content-Type': 'text/xml; charset=utf-8' },
            signal: options?.abortSignal
        };

        let client: ClientRequest | null = null;

        return new Promise<Result>((resolve: (data: Result) => void, reject: (error: Error) => void): void => {
            client = request(nodeStdHttpOptions, (readable: IncomingMessage): void => {
                if(readable.statusCode !== HTTP_STATUS.SUCCESS) {
                    reject(HttpError.unsuccessful(readable.statusCode, readable.statusMessage));
                    client!.destroy();

                    return;
                }

                this.parser.parse(readable)
                    .then((data: Result): void => resolve(data))
                    .catch((error: Error): void => {
                        client?.destroy();

                        reject(error);
                    });
            });

            client.on('socket', (socket: Socket): void => {
                if (options?.timeout) {
                    socket.setTimeout(options?.timeout);
                }

                socket.on('timeout', (): void => {
                    reject(HttpError.timeout());
                    socket.destroy();
                });
            });

            client.on('error', (error: Error): void => {
                reject(error);
                client?.destroy();
            });

            client.write(this.buildRequest());
            client.end();
        });
    }
    private buildRequest(): string {
        return '<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><NumberToDollars xmlns="http://www.dataaccess.com/webservicesserver/"><dNum>500</dNum></NumberToDollars></soap:Body></soap:Envelope>'
    }
}