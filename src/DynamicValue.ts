import { calc, dynSubscribe, field } from '@srhazi/gooey';
import type { Calculation, Dyn } from '@srhazi/gooey';
import type { QuickJSHandle } from 'quickjs-emscripten';

import { svc } from './svc';

type CompiledState =
    | { type: 'compiling'; source: string }
    | { type: 'compiled'; source: string; compiled: string }
    | { type: 'error'; source: string; error: string };

let maxId = 0;

export class DynamicValue implements Disposable {
    evaluatedValue: Calculation<QuickJSHandle>;

    private id: string;

    private name: Dyn<string | undefined>;
    private code: Dyn<string | undefined>;
    private subscriptions: Array<() => void>;

    private currFunc: QuickJSHandle | undefined;
    private currName: string | undefined;
    private compiledState = field<undefined | CompiledState>(undefined);
    private prevCompiledCode: string | undefined;
    private currentHandle: unknown;
    private prevEvaluated: QuickJSHandle | undefined;

    constructor(name: Dyn<string | undefined>, code: Dyn<string | undefined>) {
        this.currentHandle = {};
        this.name = name;
        this.code = code;

        this.id = `__DynamicValue_getter_${maxId++}`;

        this.subscriptions = [
            dynSubscribe(code, (err, code) => {
                if (err) {
                    return;
                }
                this.compile(code).catch((e) => {
                    console.error('Unexpected error in compile', e);
                });
            }),
            dynSubscribe(name, (err, name) => {
                if (err) {
                    return;
                }
                this.updateBinding(name);
            }),
        ];

        const compiledCode = calc(() => {
            const state = this.compiledState.get();
            if (state?.type === 'compiled') {
                this.prevCompiledCode = state.compiled;
                return state.compiled;
            }
            return this.prevCompiledCode;
        });

        this.evaluatedValue = calc(() => {
            const compiled = compiledCode.get();
            if (!compiled) {
                if (this.prevEvaluated) {
                    return this.prevEvaluated;
                }
                return svc('js').ctx.undefined;
            }
            svc('js').eval(compiled).dispose();
            using func = svc('js').ctx.getProp(svc('js').ctx.global, this.id);
            if (svc('js').ctx.typeof(func) !== 'function') {
                console.warn('Unexpected evaluation result!');
                if (this.prevEvaluated) {
                    return this.prevEvaluated;
                }
                return svc('js').ctx.undefined;
            }
            const result = svc('js')
                .ctx.callFunction(func, svc('js').ctx.undefined)
                .unwrap();
            if (this.prevEvaluated) {
                this.prevEvaluated.dispose();
            }
            this.prevEvaluated = result;
            return result;
        });
    }

    private updateBinding(name: string | undefined) {
        if (this.currName && this.currName !== name) {
            svc('js').deleteProp(
                svc('js').ctx.global,
                svc('js').ctx.newString(this.currName)
            );
        }
        if (name) {
            svc('js').ctx.defineProp(svc('js').ctx.global, name, {
                get: () => {
                    const result = this.evaluatedValue.get().dup();
                    return result;
                },
                configurable: true,
                enumerable: true,
            });
        }
        this.currName = name;
    }

    private async compile(source: string | undefined): Promise<void> {
        const activeHandle = {};
        this.currentHandle = activeHandle;
        if (source === undefined) {
            this.compiledState.set(undefined);
            throw new Error('Nothing to compile');
        }
        const wrappedSource = `function ${this.id}() { return (() => ${source})() }`;
        this.compiledState.set({ type: 'compiling', source });
        const compiled = await svc('compile').compile(wrappedSource);
        if (this.currentHandle !== activeHandle) {
            throw new Error('Cancelled');
        }
        this.compiledState.set({ type: 'compiled', source, compiled });
    }

    getCompiledState() {
        return this.compiledState.get();
    }

    dispose() {
        for (const sub of this.subscriptions) {
            sub();
        }
        this.updateBinding(undefined);
        this.compiledState.set(undefined);
        if (this.prevEvaluated) {
            this.prevEvaluated.dispose();
            this.prevEvaluated = undefined;
        }
        this.currName = undefined;
        if (this.currFunc) {
            this.currFunc.dispose();
            this.currFunc = undefined;
        }
    }

    [Symbol.dispose]() {
        return this.dispose();
    }
}
