import Gooey, { calc, defineCustomElement, dynGet } from '@srhazi/gooey';

import { DynamicValue } from './DynamicValue';

export function registerXInput() {
    /*
     * <x-input name="myName" value="2">
     *   <input type="text" />
     * </x-input> - a data cell reflecting and optionally setting the value of an input child element
     *
     * Attributes:
     * - name (string) (optional) - must be a valid, JavaScript name
     * - value (string) (optional) - must be a valid, JavaScript expression
     *
     * If "value" is present, the input is treated as a read-only value reflecting
     * The cell's value is a dynamic value reflecting the value of the input child element
     *
     */
    defineCustomElement({
        tagName: 'x-input',
        shadowMode: 'closed',
        observedAttributes: ['name', 'value', 'debug'],
        Component: (
            { name, value, debug },
            { onMount, onError, onDestroy, host }
        ) => {
            host.style.display = 'contents';
            const isReadonly = calc(() => dynGet(value) !== undefined);
            const dynamicValue = new DynamicValue(name, value);

            // <input> value -> dynamic value override (if we aren't readonly)
            function setOverrideFromInputElement(element: HTMLElement) {
                if (isReadonly.get()) {
                    return;
                }
                if (element instanceof HTMLInputElement) {
                    switch (element.type) {
                        // Boolean input types:
                        case 'radio':
                        case 'checkbox':
                            dynamicValue.setOverride(!!element.checked);
                            break;
                        // Numeric input types:
                        case 'number':
                        case 'range':
                            dynamicValue.setOverride(element.valueAsNumber);
                            break;
                        // Date input types:
                        case 'date':
                        case 'datetime':
                        case 'datetime-local':
                        case 'month':
                        case 'time':
                        case 'week': {
                            if (element.valueAsDate) {
                                dynamicValue.setOverride(
                                    element.valueAsDate.valueOf()
                                );
                            } else {
                                dynamicValue.clearOverride();
                            }
                            break;
                        }
                        // Text input types:
                        case 'color':
                        case 'email':
                        case 'password':
                        case 'search':
                        case 'tel':
                        case 'text':
                        case 'url':
                        default:
                            dynamicValue.setOverride(element.value);
                            break;
                    }
                } else if (element instanceof HTMLSelectElement) {
                    dynamicValue.setOverride(element.value);
                } else if (element instanceof HTMLTextAreaElement) {
                    dynamicValue.setOverride(element.value);
                }
            }

            const onInput = (e: Event) => {
                if (e.target instanceof HTMLElement) {
                    setOverrideFromInputElement(e.target);
                }
            };

            host.addEventListener('input', onInput);

            onDestroy(() => {
                dynamicValue.dispose();
                host.removeEventListener('input', onInput);
            });

            onMount(() => {
                for (const el of Array.from(
                    host.querySelectorAll('input,select,textarea')
                )) {
                    if (el instanceof HTMLElement) {
                        setOverrideFromInputElement(el);
                    }
                }
                const unsubscribe = dynamicValue.resultValue.subscribe(
                    (err, val) => {
                        if (err) {
                            return;
                        }
                        for (const el of Array.from(
                            host.querySelectorAll('input,select,textarea')
                        )) {
                            if (el instanceof HTMLInputElement) {
                                switch (el.type) {
                                    // Boolean input types:
                                    case 'radio':
                                    case 'checkbox':
                                        if (typeof val === 'boolean') {
                                            el.checked = !!val;
                                        }
                                        break;
                                    // Numeric input types:
                                    case 'number':
                                    case 'range':
                                        if (typeof val === 'number') {
                                            el.valueAsNumber = val;
                                        }
                                        break;
                                    // Date input types:
                                    case 'date':
                                    case 'month':
                                    case 'time':
                                    case 'week': {
                                        if (val instanceof Date) {
                                            el.valueAsDate = val;
                                        }
                                        break;
                                    }
                                    // Text input types:
                                    case 'color':
                                    case 'datetime-local': // Yes, value is a string!
                                    case 'email':
                                    case 'password':
                                    case 'search':
                                    case 'tel':
                                    case 'text':
                                    case 'url':
                                    default:
                                        if (typeof val === 'string') {
                                            el.value = val;
                                        }
                                        break;
                                }
                            } else if (el instanceof HTMLSelectElement) {
                                el.value = val;
                            } else if (el instanceof HTMLTextAreaElement) {
                                el.value = val;
                            }
                        }
                    }
                );
                return () => {
                    unsubscribe();
                };
            });

            return <slot />;
        },
    });
}
