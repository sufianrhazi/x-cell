import { DynamicScope } from './DynamicScope';
import type { ApplicationModel } from './state';

export function makeApplicationModel(): ApplicationModel {
    return {
        globalScope: new DynamicScope(
            undefined,
            window as unknown as Record<string, unknown>
        ),
    };
}
