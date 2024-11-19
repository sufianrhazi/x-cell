import type { Model } from '@srhazi/gooey';
import { model } from '@srhazi/gooey';

import { ModuleModel } from './ModuleModel';
import type { NameBindingModel } from './NameBindingModel';
import { assert } from './utils';

export class ApplicationModel {
    status: Model<{
        applicationStatus: string | null;
        documentStatus: string | null;
        focusStatus: string | null;
    }>;
    attributes: Model<{
        activeModule: ModuleModel;
        inspectorSelection:
            | undefined
            | {
                  type: 'nameBinding';
                  binding: NameBindingModel;
              };
    }>;

    constructor() {
        this.status = model({
            applicationStatus: `Build ${VERSION}`,
            documentStatus: '',
            focusStatus: null,
        });
        this.attributes = model({
            activeModule: new ModuleModel(),
            inspectorSelection: undefined,
        });
    }

    saveState() {
        return {
            version: 1,
        };
    }

    loadState(state: unknown) {
        assert(
            state && typeof state === 'object',
            'ApplicationModel.loadState: not an object'
        );
        assert(
            'version' in state && state.version === 1,
            'ApplicationModel.loadState: incorrect version'
        );
    }
}
