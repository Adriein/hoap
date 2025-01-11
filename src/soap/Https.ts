/*
 * Copyright (c) 2024 Adria Claret <adria.claret@gmail.com>
 * MIT Licensed
 */

import { request } from 'node:https';
import { ClientRequest, IncomingMessage} from "node:http";

export class Https {
    public do(abort: (clientRequest: ClientRequest) => void): void {
        const options = {
            hostname: "",
            method: 'POST',
            headers: { 'Content-Type': 'text/xml; charset=utf-8' }
        };

        const stdClientRequest: ClientRequest = request(options, (readable: IncomingMessage): void => {
            readable.on('data', (chunk: Buffer<ArrayBuffer>): void => {

            })
        });

        abort(stdClientRequest);
    }
    private buildRequest(): any {

    }
}