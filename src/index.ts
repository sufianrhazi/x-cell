import { init } from './svc.real';
import { registerXAction } from './x-action';
import { registerXAttrs } from './x-attrs';
import { registerXCell } from './x-cell';
import { registerXIf } from './x-if';
import { registerXInput } from './x-input';
import { registerXTimer } from './x-timer';

init()
    .then(() => {
        registerXInput();
        registerXIf();
        registerXCell();
        registerXAttrs();
        registerXAction();
        registerXTimer();
    })
    .catch((e) => {
        console.error('Unable to initialize x-cell', e);
    });
