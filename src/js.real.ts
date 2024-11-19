import { calc, createElement, Fragment } from '@srhazi/gooey';
import * as esbuild from 'esbuild-wasm';
import { getQuickJS } from 'quickjs-emscripten';
import type {
    QuickJSContext,
    QuickJSHandle,
    QuickJSRuntime,
    QuickJSWASMModule,
} from 'quickjs-emscripten';

import type { JavaScriptService } from './js';
import { assert } from './utils';

type ToDisposeCallback = (toDispose: Disposable) => void;

class RealService implements JavaScriptService {
    ctx: QuickJSContext;

    private runtime: QuickJSRuntime;
    private runtimeStart: number;

    private vmProxy: QuickJSHandle;
    private vmReflect: QuickJSHandle;
    private vmDate: QuickJSHandle;
    private vmError: QuickJSHandle;
    private vmArray: QuickJSHandle;
    private vmIs: QuickJSHandle;
    private vmTruthy: QuickJSHandle;
    private vmHasInstance: QuickJSHandle;
    private jsxHandle: QuickJSHandle;
    private createElementHandle: QuickJSHandle;
    private fragmentHandle: QuickJSHandle;
    private calcHandle: QuickJSHandle;
    private jsxSymbol: QuickJSHandle;
    private calcSymbol: QuickJSHandle;

    constructor(QuickJS: QuickJSWASMModule) {
        this.runtimeStart = Date.now();
        this.runtime = QuickJS.newRuntime({
            interruptHandler: () => {
                return Date.now() - this.runtimeStart > 1000;
            },
        });
        this.ctx = this.runtime.newContext();
        this.vmProxy = this.ctx.getProp(this.ctx.global, 'Proxy');
        this.vmReflect = this.ctx.getProp(this.ctx.global, 'Reflect');
        this.vmDate = this.ctx.getProp(this.ctx.global, 'Date');
        this.vmError = this.ctx.getProp(this.ctx.global, 'Error');
        this.vmArray = this.ctx.getProp(this.ctx.global, 'Array');
        this.vmIs = this.eval('(a, b) => a === b');
        this.vmTruthy = this.eval('(val) => !!val');
        this.vmHasInstance = this.ctx
            .getProp(this.ctx.global, 'Symbol')
            .consume((vmSymbol) => this.ctx.getProp(vmSymbol, 'hasInstance'));

        this.jsxSymbol = this.ctx.newSymbolFor('__jsx__');
        this.calcSymbol = this.ctx.newSymbolFor('__calc__');
        this.jsxHandle = this.ctx.newObject();
        this.ctx.setProp(this.ctx.global, 'JSX', this.jsxHandle);
        this.createElementHandle = this.ctx.newFunction(
            'createElement',
            this.createElementImpl
        );
        this.fragmentHandle = this.ctx.newFunction(
            'Fragment',
            this.fragmentImpl
        );
        this.ctx.setProp(
            this.jsxHandle,
            'createElement',
            this.createElementHandle
        );
        this.ctx.setProp(this.jsxHandle, 'Fragment', this.fragmentHandle);
        this.calcHandle = this.ctx.newFunction('calc', this.calcImpl);
        this.ctx.setProp(this.ctx.global, 'calc', this.calcHandle);
    }

    private createElementImpl = (
        nameHandle: QuickJSHandle,
        propsHandle: QuickJSHandle,
        ...children: QuickJSHandle[]
    ): QuickJSHandle => {
        if (!nameHandle || !propsHandle) {
            throw new Error('Unexpected arguments to createElement');
        }
        const obj = this.ctx.newObject();
        this.ctx.setProp(obj, this.jsxSymbol, this.ctx.true);
        this.ctx.setProp(obj, 'name', nameHandle);
        this.ctx.setProp(obj, 'props', propsHandle);
        using childrenHandle = this.ctx.newArray();
        for (const child of children) {
            this.ctx
                .callMethod(childrenHandle, 'push', [child])
                .unwrap()
                .dispose();
        }
        this.ctx.setProp(obj, 'children', childrenHandle);
        return obj;
    };

    private fragmentImpl = (propsHandle: QuickJSHandle): QuickJSHandle => {
        if (!propsHandle) {
            throw new Error('Unexpected arguments to Fragment');
        }
        const obj = this.ctx.newObject();
        this.ctx.setProp(obj, this.jsxSymbol, this.ctx.true);
        this.ctx.setProp(obj, 'fragment', this.ctx.true);
        this.ctx.setProp(obj, 'props', propsHandle);
        return obj;
    };

    private calcImpl = (fnHandle: QuickJSHandle): QuickJSHandle => {
        if (!fnHandle) {
            throw new Error('Unexpected arguments to calc');
        }
        const obj = this.ctx.newObject();
        using fnHandleDuped = fnHandle.dup();
        this.ctx.setProp(obj, this.calcSymbol, this.ctx.true);
        this.ctx.setProp(obj, 'calc', fnHandleDuped);
        return obj;
    };

    isJsxValue(handle: QuickJSHandle) {
        if (this.ctx.typeof(handle) !== 'object') {
            return false;
        }
        if (this.eq(handle, this.ctx.null)) {
            return false;
        }
        using val = this.ctx.getProp(handle, this.jsxSymbol);
        return this.eq(val, this.ctx.true);
    }

    isCalcValue(handle: QuickJSHandle) {
        if (this.ctx.typeof(handle) !== 'object') {
            return false;
        }
        if (this.eq(handle, this.ctx.null)) {
            return false;
        }
        using val = this.ctx.getProp(handle, this.calcSymbol);
        return this.eq(val, this.ctx.true);
    }

    new(constructor: QuickJSHandle, args: QuickJSHandle[]) {
        const arrayArgs = this.ctx.newArray();
        this.ctx.callMethod(arrayArgs, 'push', args).unwrap().dispose();
        return this.ctx.callMethod(this.vmReflect, 'construct', args).unwrap();
    }

    newDate(msSinceEpoch: number) {
        return this.new(this.vmDate, [this.ctx.newNumber(msSinceEpoch)]);
    }

    isDate(handle: QuickJSHandle) {
        using result = this.ctx
            .callMethod(this.vmDate, this.vmHasInstance, [handle])
            .unwrap();
        return this.isTruthy(result);
    }

    eq(a: QuickJSHandle, b: QuickJSHandle) {
        using result = this.ctx
            .callFunction(this.vmIs, this.ctx.undefined, [a, b])
            .unwrap();
        assert(
            'boolean' === this.ctx.typeof(result),
            'Expected boolean from an equality check'
        );
        const val = this.ctx.dump(result) as boolean;
        return val;
    }

    isTruthy(value: QuickJSHandle) {
        using result = this.ctx
            .callFunction(this.vmTruthy, this.ctx.undefined, [value])
            .unwrap();
        assert(
            'boolean' === this.ctx.typeof(result),
            'Expected boolean from an equality check'
        );
        const val = this.ctx.dump(result) as boolean;
        return val;
    }

    isArray(handle: QuickJSHandle) {
        using result = this.ctx
            .callMethod(this.vmArray, 'isArray', [handle])
            .unwrap();
        return this.eq(result, this.ctx.true);
    }

    private safeEval(code: string): QuickJSHandle {
        this.runtimeStart = Date.now();
        const result = this.ctx.evalCode(code, 'filename');
        if (result.error) {
            using e = result.error;
            const error = this.ctx.dump(e);
            throw new Error(`${error.name}: ${error.message}\n${error.stack}`);
        }
        return result.value;
    }

    defineProperty(
        obj: QuickJSHandle,
        identifier: string,
        descriptor: {
            get: () => QuickJSHandle;
            set: (val: QuickJSHandle) => boolean;
        }
    ) {
        this.ctx.defineProp(obj, identifier, {
            enumerable: true,
            configurable: true,
            get: () => {
                return descriptor.get();
            },
            set: (handle: QuickJSHandle) => {
                const failure = descriptor.set(handle);
                if (failure) {
                    this.ctx.throw(new Error(`Unable to set ${identifier}`));
                }
            },
        });
        return () => {
            this.ctx.callMethod(this.vmReflect, 'deleteProperty', [
                obj,
                this.ctx.newString(identifier),
            ]);
        };
    }

    makeSimpleProxy(handler: {
        keys: () => string[];
        get: (property: string) => QuickJSHandle;
        has: (property: string) => boolean;
        set: (property: string, value: QuickJSHandle) => boolean;
    }): {
        handle: QuickJSHandle;
        dispose: () => void;
        revoke: () => void;
        [Symbol.dispose]: () => void;
    } {
        const proxyHandler = this.ctx.newObject(this.ctx.undefined);

        const proxyGet = this.ctx.newFunction('get', (target, key) => {
            return handler.get(this.ctx.dump(key));
        });
        this.ctx.setProp(proxyHandler, 'get', proxyGet);
        proxyGet.dispose();

        const proxySet = this.ctx.newFunction('set', (target, key, val) => {
            return handler.set(this.ctx.dump(key), val)
                ? this.ctx.true
                : this.ctx.false;
        });
        this.ctx.setProp(proxyHandler, 'set', proxySet);
        proxySet.dispose();

        const proxyHas = this.ctx.newFunction('has', (target, key) => {
            return handler.has(this.ctx.dump(key))
                ? this.ctx.true
                : this.ctx.false;
        });
        this.ctx.setProp(proxyHandler, 'has', proxyHas);
        proxyHas.dispose();

        const proxyOwnKeys = this.ctx.newFunction('ownKeys', () => {
            const array = this.ctx.newArray();
            for (const key of handler.keys()) {
                this.ctx
                    .callMethod(array, 'push', [this.ctx.newString(key)])
                    .unwrap()
                    .dispose();
            }
            return array;
        });

        this.ctx.setProp(proxyHandler, 'ownKeys', proxyOwnKeys);
        proxyOwnKeys.dispose();

        const proxyGetOwnPropertyDescriptor = this.ctx.newFunction(
            'getOwnPropertyDescriptor',
            (target, prop) => {
                const propStr = this.ctx.dump(prop);
                if (!handler.keys().includes(propStr)) {
                    return this.ctx.undefined;
                }
                const obj = this.ctx.newObject(this.ctx.undefined);
                this.ctx.setProp(obj, 'configurable', this.ctx.true);
                this.ctx.setProp(obj, 'enumerable', this.ctx.true);
                return obj;
            }
        );
        this.ctx.setProp(
            proxyHandler,
            'getOwnPropertyDescriptor',
            proxyGetOwnPropertyDescriptor
        );
        proxyGetOwnPropertyDescriptor.dispose();

        const proxyTarget = this.ctx.newObject();
        const created = this.ctx
            .callMethod(this.vmProxy, 'revocable', [proxyTarget, proxyHandler])
            .unwrap();
        const createdProxy = this.ctx.getProp(created, 'proxy');
        const createdRevoke = this.ctx.getProp(created, 'revoke');
        created.dispose();
        proxyTarget.dispose();
        proxyHandler.dispose();

        return {
            handle: createdProxy,
            dispose: () => {
                createdProxy.dispose();
                createdRevoke.dispose();
            },
            revoke: () => {
                this.ctx.callFunction(createdRevoke, this.ctx.undefined);
            },
            [Symbol.dispose]() {
                this.dispose();
            },
        };
    }

    vmToHost(handle: QuickJSHandle, toDisposeCallback: ToDisposeCallback): any {
        if (this.isJsxValue(handle)) {
            using fragmentHandle = this.ctx.getProp(handle, 'fragment');
            if (this.isTruthy(fragmentHandle)) {
                using propsHandle = this.ctx.getProp(handle, 'props');
                const props: unknown = this.vmToHost(
                    propsHandle,
                    toDisposeCallback
                );
                assert(
                    props && typeof props === 'object' && 'children' in props
                );
                return createElement(
                    Fragment,
                    {},
                    props.children as JSX.Node | JSX.Node[]
                );
            } else {
                using nameHandle = this.ctx.getProp(handle, 'name');
                using propsHandle = this.ctx.getProp(handle, 'props');
                using childrenHandle = this.ctx.getProp(handle, 'children');
                const name = this.vmToHost(nameHandle, toDisposeCallback);
                const props = this.vmToHost(propsHandle, toDisposeCallback);
                const children = this.vmToHost(
                    childrenHandle,
                    toDisposeCallback
                );
                return createElement(name, props, children);
            }
        }
        if (this.isCalcValue(handle)) {
            using fnHandle = this.ctx.getProp(handle, 'calc');
            const fnHandleDup = fnHandle.dup();
            toDisposeCallback(fnHandleDup);
            return calc(() => {
                using result = this.ctx
                    .callFunction(fnHandleDup, this.ctx.undefined)
                    .unwrap();
                return this.vmToHost(result, toDisposeCallback);
            });
        }
        switch (this.ctx.typeof(handle)) {
            case 'bigint':
                return this.ctx.getBigInt(handle);
            case 'number':
                return this.ctx.getNumber(handle);
            case 'string':
                return this.ctx.getString(handle);
            case 'symbol':
                throw new Error('Unserializing symbols not supported');
            case 'undefined':
                return undefined;
            case 'boolean':
                return this.eq(this.ctx.true, handle);
            case 'object': {
                if (this.eq(this.ctx.null, handle)) {
                    return null;
                }
                if (this.isArray(handle)) {
                    const arr: any[] = [];
                    using lengthHandle = this.ctx.getProp(handle, 'length');
                    const length = this.ctx.getNumber(lengthHandle);
                    for (let i = 0; i < length; ++i) {
                        using itemHandle = this.ctx.getProp(handle, i);
                        arr.push(this.vmToHost(itemHandle, toDisposeCallback));
                    }
                    return arr;
                }
                const obj: Record<string, any> = {};
                using result = this.ctx.getOwnPropertyNames(handle).unwrap();
                for (const propHandle of result) {
                    switch (this.ctx.typeof(propHandle)) {
                        case 'string':
                        case 'number': {
                            using valueHandle = this.ctx.getProp(
                                handle,
                                propHandle
                            );
                            obj[this.ctx.getString(propHandle)] = this.vmToHost(
                                valueHandle,
                                toDisposeCallback
                            );
                            break;
                        }
                        default:
                            throw new Error(
                                `Unable to vmToHost object property of type: ${this.ctx.typeof(propHandle)}`
                            );
                    }
                }
                return obj;
            }
            case 'function': {
                const funcRef = handle.dup();
                toDisposeCallback(funcRef);
                return (...hostArgs: any[]) => {
                    const vmArgs = hostArgs.map((hostArg) =>
                        this.hostToVm(hostArg, toDisposeCallback)
                    );
                    using vmResult = this.ctx
                        .callFunction(funcRef, this.ctx.undefined, vmArgs)
                        .unwrap();
                    for (const vmArg of vmArgs) {
                        vmArg.dispose();
                    }
                    return this.vmToHost(vmResult, toDisposeCallback);
                };
            }
            default:
                throw new Error('Serializing not supported, unknown type');
        }
    }

    hostToVm(
        value: unknown,
        toDisposeCallback: ToDisposeCallback
    ): QuickJSHandle {
        if (value instanceof Error) {
            const errHandle = this.ctx
                .callMethod(this.vmReflect, 'construct', [
                    this.vmError,
                    this.hostToVm(value.name, toDisposeCallback),
                ])
                .unwrap();
            this.ctx.defineProp(errHandle, 'stack', {
                value: this.ctx.newString(
                    value.stack ?? '<host stack unknown>'
                ),
            });
            return errHandle;
        }
        switch (typeof value) {
            case 'bigint':
                return this.ctx.newBigInt(value);
            case 'number':
                return this.ctx.newNumber(value);
            case 'string':
                return this.ctx.newString(value);
            case 'symbol':
                throw new Error('Serializing symbols not supported');
            case 'undefined':
                return this.ctx.undefined;
            case 'boolean':
                return value ? this.ctx.true : this.ctx.false;
            case 'object': {
                if (!value) {
                    return this.ctx.null;
                }
                if (Array.isArray(value)) {
                    const arrHandle = this.ctx.newArray();
                    for (const item of value) {
                        using serializedItem = this.hostToVm(
                            item,
                            toDisposeCallback
                        );
                        this.ctx
                            .callMethod(arrHandle, 'push', [serializedItem])
                            .unwrap()
                            .dispose();
                    }
                    return arrHandle;
                }
                if (value instanceof Element) {
                    const simpleProxy = this.makeSimpleProxy({
                        keys: () => {
                            const keys = Object.keys(Element.prototype);
                            return keys;
                        },
                        get: (prop) => {
                            const propValue = (value as any)[prop];
                            return this.hostToVm(propValue, toDisposeCallback);
                        },
                        set: (prop, propValue) => {
                            (value as any)[prop] = this.vmToHost(
                                propValue,
                                toDisposeCallback
                            );
                            return true;
                        },
                        has: (prop) => {
                            return prop in value;
                        },
                    });
                    toDisposeCallback(simpleProxy);
                    return simpleProxy.handle;
                }
                const objHandle = this.ctx.newObject();
                for (const [prop, propValue] of Object.entries<unknown>(
                    value as any
                )) {
                    using serializedValue = this.hostToVm(
                        propValue,
                        toDisposeCallback
                    );
                    this.ctx.setProp(objHandle, prop, serializedValue);
                }
                return objHandle;
            }
            case 'function': {
                return this.ctx.newFunction(value.name, (...vmArgs) => {
                    const hostArgs = vmArgs.map((arg) =>
                        this.vmToHost(arg, toDisposeCallback)
                    );
                    const result = value(...hostArgs);
                    return this.hostToVm(result, toDisposeCallback);
                });
            }
            default:
                throw new Error('Serializing not supported, unknown type');
        }
    }

    eval(code: string) {
        return this.safeEval(code);
    }

    dispose() {
        this.vmProxy.dispose();
        this.vmReflect.dispose();
        this.vmDate.dispose();
        this.vmError.dispose();
        this.vmArray.dispose();
        this.vmIs.dispose();
        this.vmTruthy.dispose();
        this.vmHasInstance.dispose();
        this.jsxSymbol.dispose();
        this.calcSymbol.dispose();
        this.jsxHandle.dispose();
        this.createElementHandle.dispose();
        this.fragmentHandle.dispose();
        this.calcHandle.dispose();
        this.ctx.dispose();
        this.runtime.dispose();
    }

    deleteProp(target: QuickJSHandle, key: QuickJSHandle) {
        using result = this.ctx
            .callMethod(this.vmReflect, 'deleteProperty', [target, key])
            .unwrap();
        return this.eq(result, this.ctx.true);
    }

    hasProp(target: QuickJSHandle, key: QuickJSHandle) {
        using result = this.ctx
            .callMethod(this.vmReflect, 'has', [target, key])
            .unwrap();
        return this.eq(result, this.ctx.true);
    }

    newProp(key: string | number) {
        return typeof key === 'string'
            ? this.ctx.newString(key)
            : this.ctx.newNumber(key);
    }
}

export async function makeReal(): Promise<JavaScriptService> {
    const [QuickJS] = await Promise.all([
        getQuickJS(),
        esbuild.initialize({
            wasmURL: ESBUILD_WASM_URL,
        }),
    ]);

    return new RealService(QuickJS);
}

let testInitialized = false;
export async function makeTest(): Promise<JavaScriptService> {
    const [QuickJS] = await Promise.all([
        getQuickJS(),
        testInitialized
            ? null
            : esbuild.initialize({
                  wasmURL: ESBUILD_WASM_URL,
              }),
    ]);
    testInitialized = true;

    return new RealService(QuickJS);
}
