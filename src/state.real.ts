import { ApplicationModel } from './state';

export const makeApplicationModel: () => ApplicationModel = () =>
    new ApplicationModel();
