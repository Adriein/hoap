/*
 * Copyright (c) 2024 Adria Claret <adria.claret@gmail.com>
 * MIT Licensed
 */

import {ResultTreeNode} from "@Shared/Tree/ResultTreeNode";
import {JsonTreeTraverser} from "@Shared/Tree/JsonTreeTraverser";

export class ResultJsonBuilder {
    public static build(root: ResultTreeNode): any {
        const json: Record<string, any> = {};

        const visitedNodes: Record<string, any> = [];
        let previousDepth: number = 0;

        const onEnterNode = (node: ResultTreeNode, depth: number): void => {
            const numberOfPops = depth - previousDepth;

            if (numberOfPops < 0) {
                for (let i: number = 0; i < (numberOfPops * -1) + 1; i++) {
                    visitedNodes.pop();
                }
            }
            const newObj = { [node.data.tagName]: node.data.value };

            if (visitedNodes.length < 1) {
                Object.assign(json, newObj);

                visitedNodes.push(json);

                previousDepth = depth;

                return;
            }

            const parentNode: Record<string, any> = visitedNodes[visitedNodes.length - 1]!;

            const parentNodeKey: string = Object.keys(parentNode)[0]!;

            const item: any = parentNode[parentNodeKey];

            if (item) {
                if (Array.isArray(item)) {
                    Object.assign(parentNode, {[parentNodeKey]:[...item, newObj]});

                    visitedNodes.push(newObj);

                    previousDepth = depth;

                    return;
                }

                const alreadyPresent = parentNode[node.data.tagName];

                if (alreadyPresent) {
                    Object.assign(parentNode, {...item, ...newObj})

                    previousDepth = depth;

                    return;
                }

                Object.assign(newObj, parentNode[parentNodeKey]);

                parentNode[parentNodeKey] = newObj;

                visitedNodes.push(newObj);

                previousDepth = depth;

                return;
            }

            parentNode[parentNodeKey] = newObj;

            visitedNodes.push(newObj);

            previousDepth = depth;
        };

        JsonTreeTraverser.dfs(root, onEnterNode);

        return json;
    }
}