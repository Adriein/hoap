/*
 * Copyright (c) 2024 Adria Claret <adria.claret@gmail.com>
 * MIT Licensed
 */

export const UTF_8_ENCODING: BufferEncoding = "utf8";

export const XML_NODE_TYPE = "xml-node";

export const XML_DATA_TYPE = "xml-data";

export enum XmlTreeNodeStatus {
    OPEN = "OPEN",
    CLOSED = "CLOSED",
    NOT_VISITED = "NOT_VISITED"
}