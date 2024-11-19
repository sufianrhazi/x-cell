import * as state from './state.real';
import { register } from './svc';
import type { Services } from './svc';
import * as time from './time.fake';

export function _testReset(services: Partial<Services> = {}) {
    register({
        time: time.makeFake(),
        state: state.makeApplicationModel(),
        ...services,
    });
}
