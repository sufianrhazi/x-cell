import * as state from './state.real';
import { register } from './svc';
import * as time from './time.real';

export async function init() {
    register({
        time: time.makeReal(),
        state: state.makeApplicationModel(),
    });
}
