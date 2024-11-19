import Gooey, {
    calc,
    defineCustomElement,
    dynGet,
    dynSubscribe,
    field,
} from '@srhazi/gooey';
import type { QuickJSHandle } from 'quickjs-emscripten';

import { svc } from './svc';

type CompiledState =
    | { type: 'compiling'; source: string }
    | { type: 'compiled'; source: string; compiled: string }
    | { type: 'error'; source: string; error: string };

let maxId = 0;

/*
 * <x-cell name="myName" code="42"></x-cell> - an invisible 'data cell'
 *
 * Attributes:
 * - name (string) - must be a valid, JavaScript name
 * - code (string) - must be a valid, JavaScript expression
 * - debug (string) - set to "debug" to render debug information
 *
 * The cell's value is a dynamic value which represents the evaluation of the cell's code.
 *
 */
defineCustomElement({
    tagName: 'x-cell',
    shadowMode: 'closed',
    observedAttributes: ['name', 'code', 'debug'],
    Component: ({ name, code, debug }, { onMount, onError }) => {
        const id = `__xCell_getter_${maxId++}`;
        let currFunc: QuickJSHandle | undefined;
        let currName: string | undefined;
        const compiledState = field<undefined | CompiledState>(undefined);
        let prevCompiledCode: string | undefined;
        const compiledCode = calc(() => {
            const state = compiledState.get();
            if (state?.type === 'compiled') {
                prevCompiledCode = state.compiled;
                return state.compiled;
            }
            return prevCompiledCode;
        });
        let prevEvaluated: QuickJSHandle | undefined;
        const evaluatedValue = calc(() => {
            const compiled = compiledCode.get();
            if (!compiled) {
                if (prevEvaluated) {
                    return prevEvaluated;
                }
                return svc('js').ctx.undefined;
            }
            svc('js').eval(compiled).dispose();
            using func = svc('js').ctx.getProp(svc('js').ctx.global, id);
            if (svc('js').ctx.typeof(func) !== 'function') {
                console.warn('Unexpected evaluation result!');
                if (prevEvaluated) {
                    return prevEvaluated;
                }
                return svc('js').ctx.undefined;
            }
            const result = svc('js')
                .ctx.callFunction(func, svc('js').ctx.undefined)
                .unwrap();
            if (prevEvaluated) {
                prevEvaluated.dispose();
            }
            prevEvaluated = result;
            return result;
        });

        function updateBinding(name: string | undefined) {
            if (currName && currName !== name) {
                svc('js').deleteProp(
                    svc('js').ctx.global,
                    svc('js').ctx.newString(currName)
                );
            }
            if (name) {
                svc('js').ctx.defineProp(svc('js').ctx.global, name, {
                    get: () => {
                        const result = evaluatedValue.get().dup();
                        return result;
                    },
                    configurable: true,
                    enumerable: true,
                });
            }
            currName = name;
        }

        let currentHandle = {};
        async function compile(source: string | undefined): Promise<void> {
            const activeHandle = {};
            currentHandle = activeHandle;
            if (source === undefined) {
                compiledState.set(undefined);
                throw new Error('Nothing to compile');
            }
            const wrappedSource = `function ${id}() { return (() => ${source})() }`;
            compiledState.set({ type: 'compiling', source });
            const compiled = await svc('compile').compile(wrappedSource);
            if (currentHandle !== activeHandle) {
                throw new Error('Cancelled');
            }
            compiledState.set({ type: 'compiled', source, compiled });
        }

        onMount(() => {
            const subscriptions = [
                dynSubscribe(code, (err, code) => {
                    if (err) {
                        return;
                    }
                    compile(code).catch((e) => {
                        console.error('Unexpected error in compile', e);
                    });
                }),
                dynSubscribe(name, (err, name) => {
                    if (err) {
                        return;
                    }
                    updateBinding(name);
                }),
            ];
            return () => {
                for (const sub of subscriptions) {
                    sub();
                }
                updateBinding(undefined);
                compiledState.set(undefined);
                if (prevEvaluated) {
                    prevEvaluated.dispose();
                    prevEvaluated = undefined;
                }
                currName = undefined;
                if (currFunc) {
                    currFunc.dispose();
                    currFunc = undefined;
                }
            };
        });

        return (
            <>
                {calc(() => {
                    if (dynGet(debug) === 'debug') {
                        return (
                            <div>
                                <pre>name: {name}</pre>
                                <pre>code: {code}</pre>
                                <pre>
                                    compiledState:{' '}
                                    {calc(() =>
                                        JSON.stringify(
                                            compiledState.get(),
                                            null,
                                            2
                                        )
                                    )}
                                </pre>
                                <pre>
                                    value:{' '}
                                    {calc(() =>
                                        JSON.stringify(
                                            svc('js').ctx.dump(
                                                evaluatedValue.get()
                                            ),
                                            null,
                                            2
                                        )
                                    )}
                                </pre>
                            </div>
                        );
                    }
                    return null;
                })}
            </>
        );
    },
});
