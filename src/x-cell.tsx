import Gooey, { calc, defineCustomElement, dynGet } from '@srhazi/gooey';

import { DynamicValue } from './DynamicValue';
import { svc } from './svc';

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
    Component: ({ name, code, debug }, { onMount, onError, onDestroy }) => {
        const dynamicValue = new DynamicValue(name, code);
        onDestroy(() => {
            dynamicValue.dispose();
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
                                                dynamicValue.evaluatedValue.get()
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
