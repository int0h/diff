import {calcJsonArrayDiff, CompactDiffItemType} from './sequence';

function isObj(a: unknown): a is Record<string, any> {
    if (a === null) {
        return false;
    }
    if (typeof a !== 'object') {
        return false;
    }
    if (Array.isArray(a)) {
        return false;
    }
    return true;
}

const isEmptyObj = (a: unknown): a is {} => {
    return isObj(a) && Object.keys(a).length === 0;
}

function has(obj: object, prop: string) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
}

export enum DiffType {
    same,
    removed,
    added,
    replaced,
    objectDiff,
    arrayDiff,
}

export type Diff<T> = {
    type: DiffType.same;
    originalValue: T;
} | {
    type: DiffType.removed;
    originalValue: T;
} | {
    type: DiffType.added;
    newValue: T;
} | {
    type: DiffType.replaced;
    originalValue: T;
    newValue: T;
} | {
    type: DiffType.objectDiff;
    properties: Record<keyof T, Diff<T>>;
} | {
    type: DiffType.arrayDiff;
    items: Array<Diff<T>>;
};

export function calcDiff(originalValue: any, newValue: any): Diff<any> {
    if (originalValue === newValue) {
        return {
            type: DiffType.same,
            originalValue,
        };
    }
    if (
        (typeof originalValue !== typeof newValue) // at least one is not object
        || (originalValue === null || newValue === null)
        || (typeof originalValue !== 'object')
    ) {
        return {
            type: DiffType.replaced,
            originalValue,
            newValue,
        };
    }
    // for now arrays are un-diff-able
    if (Array.isArray(originalValue) || Array.isArray(newValue)) {
        if (JSON.stringify(originalValue) === JSON.stringify(newValue)) {
            return {
                type: DiffType.same,
                originalValue: originalValue,
            };
        }
        const arrDiff = calcJsonArrayDiff(originalValue, newValue);
        return {
            type: DiffType.arrayDiff,
            items: arrDiff.map((i): Diff<any> => {
                if (i.o === CompactDiffItemType.same) {
                    return {
                        type: DiffType.same,
                        originalValue: i.v,
                    };
                }
                if (i.o === CompactDiffItemType.added) {
                    return {
                        type: DiffType.added,
                        newValue: i.nv,
                    };
                }
                if (i.o === CompactDiffItemType.removed) {
                    return {
                        type: DiffType.removed,
                        originalValue: i.ov,
                    };
                }
                if (i.o === CompactDiffItemType.modified) {
                    return calcDiff(i.ov, i.nv);
                }
                throw new Error('todo');
            }),
        };
    }
    const objectDiff: Record<string, Diff<any>> = {};
    for (const key of Object.keys(originalValue)) {
        if (has(newValue, key)) {
            const diff = calcDiff(originalValue[key], newValue[key]);
            objectDiff[key] = diff;
        } else {
            objectDiff[key] = {
                type: DiffType.removed,
                originalValue: originalValue[key],
            };
        }
    }
    for (const key of Object.keys(newValue)) {
        if (!has(originalValue, key)) {
            objectDiff[key] = {
                type: DiffType.added,
                newValue: newValue[key],
            };
        }
    }
    if (isEmptyObj(objectDiff)) {
        return {
            type: DiffType.same,
            originalValue,
        };
    }
    return {
        type: DiffType.objectDiff,
        properties: objectDiff,
    };
}
