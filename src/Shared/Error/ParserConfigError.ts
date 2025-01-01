/*
 * Copyright (c) 2024 Adria Claret <adria.claret@gmail.com>
 * MIT Licensed
 */

import {LibStandardError} from "./LibStandardError";

export class ParserConfigError extends LibStandardError {
    public static noConfigFile(): ParserConfigError {
        return new ParserConfigError("No config file provided", LibStandardError.ERROR_CODES.NO_CONFIG_FILE_ERROR_CODE);
    }

    public static noPathProvided(): ParserConfigError {
        return new ParserConfigError("No path provided", LibStandardError.ERROR_CODES.NO_PATH_PROVIDED);
    }
}