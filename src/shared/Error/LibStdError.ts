/*
 * Copyright (c) 2024 Adria Claret <adria.claret@gmail.com>
 * MIT Licensed
 */

export class LibStdError extends Error {
    protected static ERROR_CODES = {
        NO_CONFIG_FILE_ERROR_CODE: 1,
        NO_PATH_PROVIDED: 2,
        NODE_PARENT_NOT_FOUND: 3,
        TIMEOUT: 4,
        UNSUCCESSFUL_REQUEST: 5,
        NO_TAG_PRESENT: 6
    };

    public constructor(public message: string, public code: number) {
        super(message);
    }
}