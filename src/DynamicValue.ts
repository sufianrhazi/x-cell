import { calc, dynGet, dynSubscribe, field } from '@srhazi/gooey';
import type { Calculation, Dyn, Field } from '@srhazi/gooey';

let maxId = 0;

const globals = field(new Set<string>());

export function evalExpression(expressionCode: string): any {
    const funcBody = new Function(`return (() => ${expressionCode})();`);
    return funcBody();
}

export class DynamicValue implements Disposable {
    resultValue: Calculation<any>;

    private id: string;

    private name: Dyn<string | undefined>;
    private code: Dyn<string | undefined>;
    private subscriptions: Array<() => void>;
    private override: Field<{ value: any } | undefined>;

    private currName: string | undefined;
    private prevCompiledCode: string | undefined;
    private currentHandle: unknown;
    private prevEvaluated: any | undefined;

    constructor(name: Dyn<string | undefined>, code: Dyn<string | undefined>) {
        this.currentHandle = {};
        this.name = name;
        this.code = code;
        this.override = field(undefined);

        this.id = `__DynamicValue_getter_${maxId++}`;

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
            // Reprocess everything if the set of globals has changed
            globals.get();

            const result = evalExpression(expressionCode);
            this.prevEvaluated = result;
            return result;
        });
    }

    setOverride(value: any) {
        this.override.set({ value });
    }

    clearOverride() {
        this.override.set(undefined);
    }

    private updateBinding(name: string | undefined) {
        let globalValues = globals.get();
        if (this.currName && this.currName !== name) {
            delete (window as any)[this.currName];
        }
        if (name) {
            Object.defineProperty(window, name, {
                get: () => {
                    return this.resultValue.get();
                },
                set: (value: any) => {
                    this.setOverride(value);
                },
                configurable: true,
                enumerable: true,
            });
            globalValues = new Set(globalValues);
            globalValues.add(name);
        }
        this.currName = name;
        globals.set(globalValues);
    }

    dispose() {
        for (const sub of this.subscriptions) {
            sub();
        }
        this.updateBinding(undefined);
        if (this.prevEvaluated) {
            this.prevEvaluated = undefined;
        }
        this.currName = undefined;
    }

    [Symbol.dispose]() {
        return this.dispose();
    }
}
