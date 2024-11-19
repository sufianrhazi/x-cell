import * as compile from './compile.real';
import * as console from './console.fake';
import * as js from './js.real';
import * as keyboard from './keyboard.fake';
import * as state from './state.real';
import { register } from './svc';
import type { Services } from './svc';
import * as time from './time.fake';

export async function _testReset(services: Partial<Services> = {}) {
    register({
        time: time.makeFake(),
        js: await js.makeTest(),
        state: state.makeApplicationModel(),
        compile: compile.makeReal(),
        keyboard: keyboard.makeFake(),
        console: console.makeFake(),
        ...services,
    });
}
