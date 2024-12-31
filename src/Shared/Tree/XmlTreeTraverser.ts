/*
 * Copyright (c) 2024 Adria Claret <adria.claret@gmail.com>
 * MIT Licensed
 */

import {XmlTreeNode} from "./XmlTreeNode";

export class XmlTreeTraverser {
    /**
     * Traverse with DFS algorithm a Tree from left to right
     * @param root Root node of the tree
     * @param fn Callback function to execute when visiting each node
     * @returns void
     */
    public static dfs(root: XmlTreeNode, fn: (node: XmlTreeNode, path: string) => void): void {
        const queue: Array<[XmlTreeNode, string]> = [[root, root.data.original]];
        const currentPath: string[] = [];

        while (queue.length > 0) {
            const [node, path] = queue.pop()!;

            currentPath.push(path);

            fn(node, currentPath.join("/"));

            for (let i: number = node.children.length - 1; i >= 0; i--) {
                if (!node.children[i]) {
                    currentPath.pop();

                    continue;
                }

                currentPath.push(node.children[i]!.data.original)

                queue.push([node.children[i]!, currentPath.join("/")]);

                currentPath.pop();
            }

            currentPath.pop();
        }
    }
}