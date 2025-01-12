export type SoapRequestAbortFn = () => void;

export type SoapRequest = {
    promise: Promise<any>,
    abort: SoapRequestAbortFn,
}