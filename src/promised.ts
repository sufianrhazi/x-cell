import { assert } from './utils';

export interface Promised<T> {
    promise: Promise<T>;
    resolve: (val: T) => void;
    reject: (err: any) => void;
}
export function makePromised<T>(): Promised<T> {
    let resolve: undefined | ((val: T) => void);
    let reject: undefined | ((err: any) => void);
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    assert(resolve && reject);
    return { promise, resolve, reject };
}
