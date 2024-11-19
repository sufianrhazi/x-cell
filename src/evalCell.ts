import { calc } from '@srhazi/gooey';

import { svc } from './svc';

export async function evalCell(code: string) {
    const compiled = await svc('compile').compile(code);
    return calc(() => {
        svc('js').eval(compiled).dispose();
    });
}
