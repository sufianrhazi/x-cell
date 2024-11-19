import * as compile from './compile.real';
import * as js from './js.real';
import * as state from './state.real';
import { register } from './svc';
import * as time from './time.real';

export async function init() {
    register({
        js: await js.makeReal(),
        time: time.makeReal(),
        state: state.makeApplicationModel(),
        compile: compile.makeReal(),
    });
}
