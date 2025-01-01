/*
 * Copyright (c) 2024 Adria Claret <adria.claret@gmail.com>
 * MIT Licensed
 */

import {RawBinaryXmlTagPair, WatchedXmlTagNode, WatchedXmlTagsJson} from "@Shared/Types";

export class XmlTreeNode {
    public constructor(
        private _data: RawBinaryXmlTagPair,
        private _children: XmlTreeNode[] = []
    ) {}

    public get data(): RawBinaryXmlTagPair {
        return this._data;
    }

    public get children(): XmlTreeNode[] {
        return this._children;
    }

    public addChild(node: XmlTreeNode): void {
        this._children.push(node);
    }
}