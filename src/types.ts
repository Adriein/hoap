export type RawBinaryXmlTagPair = { open: Buffer<ArrayBuffer>, close: Buffer<ArrayBuffer>}

export type WatchedXmlTagNode = { name: string, leafs: string[] }

export type WatchedXmlTagsJson = { version: string, nodes: WatchedXmlTagNode[] }