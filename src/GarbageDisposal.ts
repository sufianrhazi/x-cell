/**
 * A convenience class which disposes all of the disposable items it has managed when it is disposed.
 *
 * .dispose() clears its managed set, so it may be called multiple times.
 *
 * Usage:
 *     const gd = new GarbageDisposal();
 *     gd.manage(someDisposableObject);
 *     gd.manage(someOtherDisposableObject);
 *     gd[Symbol.dispose]();
 *
 * A few cases in the codebase take a toDisposeCallback, which `.manage` can be passed to:
 *
 * i.e.:
 *     const gd = new GarbageDisposal();
 *     svc('js').hostToVm(someObject, gd.manage);
 *     gd[Symbol.dispose](); // all of the resources allocated as part of calling hostToVm are disposed here
 *
 */
export class GarbageDisposal implements Disposable {
    private toDispose: Disposable[];

    constructor() {
        this.toDispose = [];
    }

    manage = (disposable: Disposable) => {
        this.toDispose.push(disposable);
    };

    [Symbol.dispose]() {
        this.dispose();
    }

    dispose() {
        for (const disposable of this.toDispose) {
            disposable[Symbol.dispose]();
        }
        this.toDispose = [];
    }
}
