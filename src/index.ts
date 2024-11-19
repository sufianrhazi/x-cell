import { init } from './svc.real';
import { registerXAttrs } from './x-attrs';
import { registerXCell } from './x-cell';
import { registerXIf } from './x-if';
import { registerXInput } from './x-input';

init()
    .then(() => {
        registerXInput();
        registerXIf();
        registerXCell();
        registerXAttrs();
    })
    .catch((e) => {
        console.error('Unable to initialize x-cell', e);
    });
