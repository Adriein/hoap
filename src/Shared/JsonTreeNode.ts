/*
 * Copyright (c) 2024 Adria Claret <adria.claret@gmail.com>
 * MIT Licensed
 */


import {JsonResultData} from "./types";

export class JsonTreeNode {
    public constructor(
        private _data: JsonResultData,
        private _children: JsonTreeNode[] = []
    ) {}

    public get data(): JsonResultData {
        return this._data;
    }

    public get children(): JsonTreeNode[] {
        return this._children;
    }

    public addChild(node: JsonTreeNode): void {
        this._children.push(node);
    }
}