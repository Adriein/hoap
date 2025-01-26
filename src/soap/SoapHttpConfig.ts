import {Agent} from "node:https";

export class SoapHttpConfig {
    private readonly _DEFAULT_TIMEOUT: number = 60_000;

    public static instance(): SoapHttpConfig {
        return new SoapHttpConfig();
    }

    private constructor(
        private _defaultTimeout: number = this._DEFAULT_TIMEOUT,
        private _agent?: Agent,
    ) {}

    public withDefaultTimeout(timeout: number): SoapHttpConfig {
        this._defaultTimeout = timeout;

        return this;
    }

    public withAgent(agent: Agent): SoapHttpConfig {
        this._agent = agent;

        return this;
    }


    public get defaultTimeout(): number {
        return this._defaultTimeout;
    }

    public get agent(): Agent | undefined{
        return this._agent;
    }
}