export type RawBinaryXmlTagPair = { original: string, open: Buffer<ArrayBuffer>, close: Buffer<ArrayBuffer>}

export type WatchedXmlTagNode = { name: string, type: string, children?: WatchedXmlTagNode[] }

export type WatchedXmlTagsJson = { version: string, nodes: WatchedXmlTagNode[] }