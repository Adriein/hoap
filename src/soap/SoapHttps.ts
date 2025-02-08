/*
 * Copyright (c) 2025 Adria Claret <adria.claret@gmail.com>
 * MIT Licensed
 */

import {request, RequestOptions} from 'node:https';
import {ClientRequest, IncomingMessage} from "node:http";
import {Result, SoapHttpOptions} from "@shared/Types";
import {HoapParser} from "@parser/HoapParser";
import {HTTP_STATUS} from "@shared/Constants";
import {Socket} from 'node:net';
import {HttpError} from "@soap/Error/HttpError";
import {SoapHttpConfig} from "@soap/SoapHttpConfig";

export class SoapHttps {
    public constructor(
        private readonly parser: HoapParser,
        private readonly instanceConfig: SoapHttpConfig,
    ) {}

    public do(url: string, body: string, options?: SoapHttpOptions): Promise<Result> {
        const [host, ...path] = url.split("/");

        const header: Record<string, string> = options?.header?
            { 'Content-Type': 'text/xml; charset=utf-8', ...options.header} :
            { 'Content-Type': 'text/xml; charset=utf-8'};

        const nodeStdHttpOptions: RequestOptions = {
            hostname: host,
            path: `/${path.join("/")}`,
            method: 'POST',
            headers: header,
            signal: options?.abortSignal,
            timeout: options?.timeout ?? this.instanceConfig.defaultTimeout,
            agent: this.instanceConfig.agent,
        };

        let client: ClientRequest | null = null;

        return new Promise<Result>((resolve: (data: Result) => void, reject: (error: Error) => void): void => {
            client = request(nodeStdHttpOptions, (readable: IncomingMessage): void => {
                if(readable.statusCode !== HTTP_STATUS.SUCCESS) {
                    reject(HttpError.unsuccessful(readable.statusCode, readable.statusMessage));
                    client?.destroy();

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
                socket.on('timeout', (): void => {
                    reject(HttpError.timeout());
                    socket.destroy();
                });
            });

            client.on('error', (error: Error): void => {
                reject(error);
                client?.destroy();
            });

            client.write(body);
            client.end();
        });
    }
}