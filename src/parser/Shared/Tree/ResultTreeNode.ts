/*
 * Copyright (c) 2024 Adria Claret <adria.claret@gmail.com>
 * MIT Licensed
 */

import {JsonResultData, ResultTreeMetadata} from "@shared/Types";

export class ResultTreeNode {
    public static init(): ResultTreeNode {
        return new ResultTreeNode(
            {
                tagName: "root",
                value: null
            },
            {
                position: { open: 0, close: -1 },
            },
        )
    }

    public constructor(
        private _data: JsonResultData,
        private _metadata: ResultTreeMetadata,
        private _children: ResultTreeNode[] = []
    ) {}

    public get data(): JsonResultData {
        return this._data;
    }

    public get metadata(): ResultTreeMetadata {
        return this._metadata;
    }

    public get children(): ResultTreeNode[] {
        return this._children;
    }

    public addChild(node: ResultTreeNode): void {
        this._children.push(node);
    }

    public isInRange(openTagIndex: number, closeTagIndex: number): boolean {
        return this._metadata.position.open <= openTagIndex && this._metadata.position.close >= closeTagIndex;
    }
}