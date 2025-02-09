/*
 * Copyright (c) 2025 Adria Claret <adria.claret@gmail.com>
 * MIT Licensed
 */

import {LibStdError} from "@shared/Error";

export class XmlTransformerError extends LibStdError {
    private static NO_TAG_PRESENT: string = "NO_TAG_PRESENT";

    public static noTag(): XmlTransformerError {
        return new XmlTransformerError(
            XmlTransformerError.NO_TAG_PRESENT,
            LibStdError.ERROR_CODES.NO_TAG_PRESENT,
        );
    }

    public constructor(
        public message: string,
        public code: number,
    ) {
        super(message, code);
    }
}