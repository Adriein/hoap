/*
 * Copyright (c) 2024 Adria Claret <adria.claret@gmail.com>
 * MIT Licensed
 */

import {InRangeFn, Token} from "@shared/Types";

export const isInRange: InRangeFn = (
    node: Token,
    openTagIndex: number,
    closeTagIndex: number
): boolean => {
    return node.$position.open <= openTagIndex && node.$position.close >= closeTagIndex;
};