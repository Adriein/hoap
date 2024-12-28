/*
 * Copyright (c) 2024 Adria Claret <adria.claret@gmail.com>
 * MIT Licensed
 */

import {XmlTreeNodeStatus} from "./constants";

export type RawBinaryXmlTagPair = {
    original: string,
    open: Buffer<ArrayBuffer>,
    close: Buffer<ArrayBuffer>,
    type: string,
    status: XmlTreeNodeStatus,
};

export type WatchedXmlTagNode = { name: string, type: string, children?: WatchedXmlTagNode[] }

export type WatchedXmlTagsJson = { version: string, nodes: WatchedXmlTagNode[] }