/*
 * Copyright (c) 2024 Adria Claret <adria.claret@gmail.com>
 * MIT Licensed
 */

import {ResultTreeNode} from "@Shared/Tree/ResultTreeNode";
import {JsonTreeTraverser} from "@Shared/Tree/JsonTreeTraverser";

export class ResultJsonBuilder {
    public static build(root: ResultTreeNode): any {
        const json: Record<string, any> = {};

        let visitedNodes: ResultTreeNode[] = [];

        const onEnterNode = (node: ResultTreeNode): void => {
            if (visitedNodes.length <= 0) {
                Object.assign(json, { [node.data.tagName]: null });

                visitedNodes.push(node);

                return;
            }

            const parentNode: ResultTreeNode = visitedNodes[visitedNodes.length - 1]!;

            const item: any = json[parentNode.data.tagName];

            if (item) {
                if (Array.isArray(item)) {
                    json[parentNode.data.tagName] = [...item, { [node.data.tagName]: node.data.value }];

                    visitedNodes.push(node);

                    return;
                }

                json[parentNode.data.tagName] = { [node.data.tagName]: node.data.value };

                visitedNodes.push(node);

                return;
            }

            json[parentNode.data.tagName] = { [node.data.tagName]: node.data.value };

            visitedNodes.push(node);
        };

        const onLeaveNode: () => void = (): void => {
            visitedNodes.pop();
        };

        JsonTreeTraverser.dfs(root, onEnterNode, onLeaveNode);

        return json;
    }
}