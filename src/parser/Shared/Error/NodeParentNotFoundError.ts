import {LibStdError} from "@shared/Error";

export class NodeParentNotFoundError extends LibStdError {
    public constructor(path: string) {
        super(`Node parent not found for path: ${path}`, LibStdError.ERROR_CODES.NODE_PARENT_NOT_FOUND);
    }
}