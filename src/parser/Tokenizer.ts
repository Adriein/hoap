/*
 * Copyright (c) 2025 Adria Claret <adria.claret@gmail.com>
 * MIT Licensed
 */

import {Token} from "@shared/Types";
import {XML} from "@shared/Constants";

export class Tokenizer {
    /**
     * Create a new result node
     * @param tagName Original XML tag name string without closing or opening symbols
     * @param open Position of the XML openTag relative to the whole XML response
     * @param close Position of the XML closeTag relative to the whole XML response
     * @param value Value of the tag in case is a data node
     * @param attribute
     * @returns Token
     */
    public static token(
        tagName: string,
        open: number,
        close: number = -1,
        value: string | number | null = null,
        attribute: string | null = null,
    ): Token {
        return {
            $name: tagName,
            $value: value,
            $attribute: attribute,
            $position: {open, close},
        };
    }

    /**
     * Check if the next char is not a > or a blank space, meaning that we found a similar tag but not the
     * one we are looking for
     * E.g:
     *  <recommendation> -> valid
     *  <recommendation xmlns=www.soap.com> -> valid
     *  <recommendationOne> -> invalid
     * @param char Original XML tag name string without closing or opening symbols
     * @returns boolean
     */
    public static isFalsePositive(char: number): boolean {
        return (char !== XML.GT_TAG[0]) && (char !== XML.BLANK_SPACE[0]);
    }
}