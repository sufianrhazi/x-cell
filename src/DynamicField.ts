import { calc, dynGet, dynSubscribe } from '@srhazi/gooey';
import type { Calculation, Dyn } from '@srhazi/gooey';
import type { QuickJSHandle } from 'quickjs-emscripten';

import { svc } from './svc';

export class DynamicField implements Disposable {
    evaluatedValue: Calculation<QuickJSHandle>;

    private name: Dyn<string | undefined>;
    private value: Dyn<QuickJSHandle | undefined>;
    private subscriptions: Array<() => void>;

    private currName: string | undefined;
    private prevEvaluated: QuickJSHandle | undefined;

    constructor(
        name: Dyn<string | undefined>,
        value: Dyn<QuickJSHandle | undefined>
    ) {
        this.name = name;
        this.value = value;

        this.subscriptions = [
            dynSubscribe(name, (err, name) => {
                if (err) {
                    return;
                }
                this.updateBinding(name);
            }),
        ];

        this.evaluatedValue = calc(() => {
            const result = dynGet(this.value);
            if (this.prevEvaluated) {
                this.prevEvaluated.dispose();
                this.prevEvaluated = undefined;
            }
            this.prevEvaluated = result;
            if (!result) {
                return svc('js').ctx.undefined;
            }
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

    dispose() {
        for (const sub of this.subscriptions) {
            sub();
        }
        this.updateBinding(undefined);
        if (this.prevEvaluated) {
            this.prevEvaluated.dispose();
            this.prevEvaluated = undefined;
        }
        this.currName = undefined;
    }

    [Symbol.dispose]() {
        return this.dispose();
    }
}
