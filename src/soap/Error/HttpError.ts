/*
 * Copyright (c) 2025 Adria Claret <adria.claret@gmail.com>
 * MIT Licensed
 */

import {LibStdError} from "@shared/Error";

export class HttpError extends LibStdError {
    private static REQUEST_FAILED: string = "REQUEST_FAILED";
    private static TIMEOUT: string = "TIMEOUT";

    public static timeout(): HttpError {
        return new HttpError(HttpError.TIMEOUT, LibStdError.ERROR_CODES.TIMEOUT);
    }

    public static unsuccessful(httpCode?: number, httpMessage?: string, httpErrorBody?: string): HttpError {
        return new HttpError(
            HttpError.REQUEST_FAILED,
            LibStdError.ERROR_CODES.UNSUCCESSFUL_REQUEST,
            httpCode,
            httpMessage,
            httpErrorBody
        );
    }

    public constructor(
        public message: string,
        public code: number,
        public httpCode?: number,
        public httpMessage?: string,
        public httpErrorBody?: string,
    ) {
        super(message, code);

        this.httpCode = httpCode;
        this.httpMessage = httpMessage;
        this.httpErrorBody = httpErrorBody;
    }
}