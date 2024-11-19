import type { QuickJSContext, QuickJSHandle } from 'quickjs-emscripten';

export type GlobalsRecord = Record<
    string,
    { get: () => any; set: (val: any) => boolean }
>;

export interface JavaScriptService {
    /** The sandbox context */
    ctx: QuickJSContext;

    /** Define a global getter & setter */
    defineProperty(
        obj: QuickJSHandle,
        identifier: string,
        descriptor: {
            get: () => QuickJSHandle;
            set: (val: QuickJSHandle) => boolean;
        }
    ): () => void;

    /** Make a Proxy object in the VM */
    makeSimpleProxy(handler: {
        keys: () => string[];
        get: (property: string) => QuickJSHandle;
        has: (property: string) => boolean;
        set: (property: string, value: QuickJSHandle) => boolean;
    }): { handle: QuickJSHandle; dispose: () => void; revoke: () => void };

    /** Check strict equality (===) within the vm */
    eq: (a: QuickJSHandle, b: QuickJSHandle) => boolean;

    /** Check truthiness within the vm */
    isTruthy: (value: QuickJSHandle) => boolean;

    /** Equivalent to the `delete` keyword */
    deleteProp: (target: QuickJSHandle, key: QuickJSHandle) => boolean;

    /** Equivalent to the `in` keyword */
    hasProp: (target: QuickJSHandle, key: QuickJSHandle) => boolean;

    /** Evaluate code in the global context; return value must be .dispose()d when released */
    eval: (code: string) => QuickJSHandle;

    /**
     * Copy a value from the VM to the host; functions are preserved.
     * The callback is called when any resources are allocated that must be alive during the lifetime of the vm value.
     */
    vmToHost: (
        value: QuickJSHandle,
        toDisposeCallback: (disposable: Disposable) => void
    ) => any;

    /**
     * Copy a value from the host to the VM; functions are preserved.
     * The callback is called when any resources are allocated that must be alive during the lifetime of the vm value.
     * */
    hostToVm: (
        value: any,
        toDisposeCallback: (disposable: Disposable) => void
    ) => QuickJSHandle;

    /** Destroy the service */
    dispose: () => void;

    /** Equivalent to `typeof value === 'string' ? svc('js').ctx.newString(value) : svc('js').ctx.newNumber(value)` */
    newProp: (value: string | number) => QuickJSHandle;
}
