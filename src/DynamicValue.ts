import { calc, dynGet, dynSubscribe, field } from '@srhazi/gooey';
import type { Calculation, Dyn, Field } from '@srhazi/gooey';

import { getDynamicScope } from './DynamicScope';

export class DynamicValue implements Disposable {
    resultValue: Calculation<any>;
    private resultValueHandle: (() => void) | undefined;

    private mountedHost: Field<Element | undefined>;

    private name: Dyn<string | undefined>;
    private code: Dyn<string | undefined>;
    private subscriptions: Array<() => void>;
    private override: Field<{ value: any } | undefined>;

    private previousBinding: (() => void) | undefined;
    private prevEvaluated: any | undefined;

    constructor(name: Dyn<string | undefined>, code: Dyn<string | undefined>) {
        this.mountedHost = field(undefined);
        this.name = name;
        this.code = code;
        this.override = field(undefined);

        this.previousBinding = undefined;

        this.subscriptions = [
            dynSubscribe(name, (err, name) => {
                if (err) {
                    return;
                }
                this.updateBinding(name);
            }),
        ];

        this.resultValue = calc(() => {
            const override = this.override.get();
            if (override) {
                return override.value;
            }
            const expressionCode = dynGet(code);
            if (expressionCode === undefined) {
                if (this.prevEvaluated) {
                    return this.prevEvaluated;
                }
                return undefined;
            }

            const result = getDynamicScope(
                this.mountedHost.get()
            ).evalExpression(expressionCode);

            this.prevEvaluated = result;
            return result;
        });
        this.resultValueHandle = undefined;
    }

    onMount(hostElement: Element) {
        this.mountedHost.set(hostElement);
        this.updateBinding(dynGet(this.name));
        this.resultValueHandle = this.resultValue.subscribe(() => {});
    }

    onUnmount() {
        this.mountedHost.set(undefined);
        this.updateBinding(dynGet(this.name));
        this.resultValueHandle?.();
    }

    setOverride(value: any) {
        this.override.set({ value });
    }

    clearOverride() {
        this.override.set(undefined);
    }

    private updateBinding(name: string | undefined) {
        const dynamicScope = getDynamicScope(this.mountedHost.get());
        if (this.previousBinding) {
            this.previousBinding();
            this.previousBinding = undefined;
        }
        if (name) {
            this.previousBinding = dynamicScope.addBinding(name, {
                get: () => {
                    return this.resultValue.get();
                },
                set: (value: any) => {
                    this.setOverride(value);
                },
            });
        }
    }

    dispose() {
        for (const sub of this.subscriptions) {
            sub();
        }
        this.updateBinding(undefined);
        if (this.prevEvaluated) {
            this.prevEvaluated = undefined;
        }
        if (this.previousBinding) {
            this.previousBinding();
            this.previousBinding = undefined;
        }
    }

    [Symbol.dispose]() {
        return this.dispose();
    }
}
