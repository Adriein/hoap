/*
 * Copyright (c) 2024 Adria Claret <adria.claret@gmail.com>
 * MIT Licensed
 */

import {WatchedXmlTagsJson} from "@shared/Types";

export class ParserConfig {
    private constructor(
        private _encoding: BufferEncoding = "binary",
        private _configFile?: WatchedXmlTagsJson,
        private _path?: string | undefined,
    ) {}

    public static instance(): ParserConfig {
        return new ParserConfig();
    }

    public withFilePath(path: string): ParserConfig {
        this._path = path;

        return this;
    }

    public withEncoding(encoding: BufferEncoding): ParserConfig {
        this._encoding = encoding;

        return this;
    }

    public withConfigFile(json: WatchedXmlTagsJson): ParserConfig {
        this._configFile = json;

        return this;
    }


    public get encoding(): BufferEncoding {
        return this._encoding;
    }

    public get path(): string | undefined {
        return this._path;
    }

    public get configFile(): WatchedXmlTagsJson | undefined {
        return this._configFile;
    }
}