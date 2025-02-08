/*
 * Copyright (c) 2024 Adria Claret <adria.claret@gmail.com>
 * MIT Licensed
 */

export const UTF_8_ENCODING: BufferEncoding = "utf8";

export const XML_NODE_TYPE = "xml-node";

export const NODE_STREAM_DATA_EVENT = "data";
export const NODE_STREAM_END_EVENT = "end";
export const NODE_STREAM_ERROR_EVENT = "error";

export enum ParsingNodeStatus {
    OPEN = "OPEN",
    CLOSED = "CLOSED",
    INFORMATION_NOT_EXTRACTED = "INFORMATION_NOT_EXTRACTED"
}

export const XML = {
    GT_TAG: Buffer.from(">", UTF_8_ENCODING),
    BLANK_SPACE: Buffer.from(" ", UTF_8_ENCODING),
}

export enum HTTP_STATUS {
    SUCCESS = 200,
}