/*
 * Copyright (c) 2025 Adria Claret <adria.claret@gmail.com>
 * MIT Licensed
 */

import {LibStdError} from "@shared/Error";

export class HttpError extends LibStdError {
    public static timeout(): HttpError {
        return new HttpError("Timeout", LibStdError.ERROR_CODES.TIMEOUT);
    }

    public static unsuccessful(httpCode?: number, message?: string): HttpError {
        if (httpCode && message) {
            return new HttpError(
                `Request failed with code ${httpCode}, ${message}`,
                LibStdError.ERROR_CODES.UNSUCCESSFUL_REQUEST
            );
        }

        return new HttpError(
            `Request failed`,
            LibStdError.ERROR_CODES.UNSUCCESSFUL_REQUEST
        );
    }
}