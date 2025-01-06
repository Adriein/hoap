/*
 * Copyright (c) 2024 Adria Claret <adria.claret@gmail.com>
 * MIT Licensed
 */

import {LibStdError} from "./LibStdError";

export class ParserConfigError extends LibStdError {
    public static noConfigFile(): ParserConfigError {
        return new ParserConfigError("No config file provided", LibStdError.ERROR_CODES.NO_CONFIG_FILE_ERROR_CODE);
    }

    public static noPathProvided(): ParserConfigError {
        return new ParserConfigError("No path provided", LibStdError.ERROR_CODES.NO_PATH_PROVIDED);
    }
}