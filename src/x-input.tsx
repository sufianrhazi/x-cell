import Gooey, { calc, defineCustomElement, dynGet } from '@srhazi/gooey';

import { DynamicValue } from './DynamicValue';
import { svc } from './svc';

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
                            dynamicValue.setOverride(
                                element.checked
                                    ? svc('js').ctx.true
                                    : svc('js').ctx.false
                            );
                            break;
                        // Numeric input types:
                        case 'number':
                        case 'range':
                            dynamicValue.setOverride(
                                svc('js').ctx.newNumber(element.valueAsNumber)
                            );
                            break;
                        // Date input types:
                        case 'date':
                        case 'datetime':
                        case 'datetime-local':
                        case 'month':
                        case 'time':
                        case 'week': {
                            if (element.valueAsDate) {
                                using dateValue = svc('js').newDate(
                                    element.valueAsDate.valueOf()
                                );
                                dynamicValue.setOverride(dateValue);
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
                            dynamicValue.setOverride(
                                svc('js').ctx.newString(element.value)
                            );
                            break;
                    }
                } else if (element instanceof HTMLSelectElement) {
                    dynamicValue.setOverride(
                        svc('js').ctx.newString(element.value)
                    );
                } else if (element instanceof HTMLTextAreaElement) {
                    dynamicValue.setOverride(
                        svc('js').ctx.newString(element.value)
                    );
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
                                        if (
                                            svc('js').ctx.typeof(val) ===
                                            'boolean'
                                        ) {
                                            el.checked =
                                                svc('js').isTruthy(val);
                                        }
                                        break;
                                    // Numeric input types:
                                    case 'number':
                                    case 'range':
                                        if (
                                            svc('js').ctx.typeof(val) ===
                                            'number'
                                        ) {
                                            el.valueAsNumber =
                                                svc('js').ctx.getNumber(val);
                                        }
                                        break;
                                    // Date input types:
                                    case 'date':
                                    case 'month':
                                    case 'time':
                                    case 'week': {
                                        if (svc('js').isDate(val)) {
                                            using when = svc('js')
                                                .ctx.callMethod(val, 'valueOf')
                                                .unwrap();
                                            el.valueAsDate = new Date(
                                                svc('js').ctx.getNumber(when)
                                            );
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
                                        if (
                                            svc('js').ctx.typeof(val) ===
                                            'string'
                                        ) {
                                            el.value =
                                                svc('js').ctx.getString(val);
                                        }
                                        break;
                                }
                            } else if (el instanceof HTMLSelectElement) {
                                el.value = svc('js').ctx.getString(val);
                            } else if (el instanceof HTMLTextAreaElement) {
                                el.value = svc('js').ctx.getString(val);
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
