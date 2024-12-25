/*
 * Copyright (c) 2024 Adria Claret <adria.claret@gmail.com>
 * MIT Licensed
 */

export class ParserConfig {
    private constructor(
        private _encoding: BufferEncoding = "binary",
        private _tags: string[] = [],
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

    public withTags(tags: string[]): ParserConfig {
        this._tags = tags;

        return this;
    }


    public get encoding(): BufferEncoding {
        return this._encoding;
    }

    public get path(): string | undefined {
        return this._path;
    }

    public get tags(): string[] {
        return this._tags;
    }
}