import Gooey, { calc, defineCustomElement, dynGet } from '@srhazi/gooey';

import { DynamicValue } from './DynamicValue';
import { svc } from './svc';

export function registerXCell() {
    /*
     * <x-cell name="myName" code="42"></x-cell> - an invisible 'data cell'
     *
     * Attributes:
     * - name (string) - must be a valid, JavaScript name
     * - code (string) - must be a valid, JavaScript expression
     * - display (string) - must be a valid, JavaScript expression
     * - debug (string) - set to "debug" to render debug information
     *
     * The cell's value is a dynamic value which represents the evaluation of the cell's code.
     *
     */
    defineCustomElement({
        tagName: 'x-cell',
        observedAttributes: ['name', 'code', 'display', 'debug'],
        Component: (
            { name, code, display, debug },
            { onMount, onError, onDestroy, host }
        ) => {
            host.style.display = 'contents';
            const displayValue = new DynamicValue(undefined, display);
            const dynamicValue = new DynamicValue(name, code);
            onDestroy(() => {
                dynamicValue.dispose();
            });

            return (
                <>
                    {calc(() => {
                        using display = displayValue.resultValue.get().dup();
                        return svc('js').vmToHost(display, () => {});
                    })}
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
                                                dynamicValue.getCompiledState(),
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
                                                    dynamicValue.resultValue.get()
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
}
