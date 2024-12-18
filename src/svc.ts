import type { ApplicationModel } from './state';
import type { TimeService } from './time';
import { assert } from './utils';

export interface Services {
    time: TimeService;
    state: ApplicationModel;
}

let registry: Services | undefined;

export function register(services: Services) {
    registry = services;
}

export function svc<T extends keyof Services>(which: T): Services[T] {
    assert(registry, 'svc not initialized');
    return registry[which];
}
