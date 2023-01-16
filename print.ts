import { Diff, DiffType } from "./object";

export type DiffJsonLine = {
    str: string;
    type: 'added' | 'removed' | 'same';
}

function identLines(lines: DiffJsonLine[], ident: string): DiffJsonLine[] {
    return lines.map((l) => ({
        str: ident + l.str,
        type: l.type,
    }));
}

function toJsonLines(obj: any, type: 'added' | 'removed' | 'same', ident: string, firstLinePrefix: string = ''): DiffJsonLine[] {
    return (firstLinePrefix + JSON.stringify(obj, null, ident))
        .split('\n')
        .map(str => ({str, type}))
}

function toEmptyLines(obj: any, type: 'added' | 'removed' | 'same'): DiffJsonLine[] {
    return JSON.stringify(obj, null, 4)
        .split('\n')
        .map(() => ({str: ' '.repeat(4), type}))
}

type PrepareJsonDiffParams = {
    diff: Diff<any>;
    viewSide: 'old' | 'new' | 'unified';
    ident: string;
    leaveSpace?: boolean;
    firstLinePrefix?: string;
    hideSame?: boolean;
}

export function diffToLines({diff, ident, viewSide, leaveSpace, firstLinePrefix = '', hideSame = false}: PrepareJsonDiffParams): DiffJsonLine[] {
    if (diff.type === DiffType.same) {
        if (hideSame) {
            return [];
        } else {
            return toJsonLines(diff.originalValue, 'same', ident, firstLinePrefix);
        }
    }
    if (diff.type === DiffType.added) {
        if (viewSide !== 'old') {
            return toJsonLines(diff.newValue, 'added', ident, firstLinePrefix);
        } else {
            if (leaveSpace) {
                return toEmptyLines(diff.newValue, 'same');
            } else {
                return [];
            }
        }
    }
    if (diff.type === DiffType.removed) {
        if (viewSide !== 'new') {
            return toJsonLines(diff.originalValue, 'removed', ident, firstLinePrefix);
        } else {
            if (leaveSpace) {
                return toEmptyLines(diff.originalValue, 'same');
            } else {
                return [];
            }
        }
    }
    if (diff.type === DiffType.replaced) {
        if (viewSide === 'old') {
            return toJsonLines(diff.originalValue, 'removed', ident, firstLinePrefix);
        }
        if (viewSide === 'new') {
            return toJsonLines(diff.newValue, 'added', ident, firstLinePrefix);
        }
        if (viewSide === 'unified') {
            return [
                ...toJsonLines(diff.originalValue, 'removed', ident, firstLinePrefix),
                ...toJsonLines(diff.newValue, 'added', ident, firstLinePrefix),
            ];
        }
        throw new Error('todo');
    }
    if (diff.type === DiffType.objectDiff) {
        const pairs = Object.entries(diff.properties);
        return [
            {str: firstLinePrefix + '{', type: 'same'},
            ...pairs.map(([key, propDiff], index) => {
                if (leaveSpace && propDiff.type === DiffType.added && viewSide === 'old') {
                    return toEmptyLines(propDiff.newValue, 'same');
                }
                if (leaveSpace && propDiff.type === DiffType.removed && viewSide === 'new') {
                    return toEmptyLines(propDiff.originalValue, 'same');
                }
                const propDiffLines = identLines(diffToLines({
                    diff: propDiff,
                    viewSide,
                    ident,
                    firstLinePrefix: JSON.stringify(key) + ': ',
                    hideSame,
                }), ident);
                if (index < pairs.length - 1 && propDiffLines.length > 0) {
                    propDiffLines[propDiffLines.length - 1].str += ',';
                }
                return propDiffLines;
            }).flat(1),
            {str: '}', type: 'same'},
        ];
    }
    if (diff.type === DiffType.arrayDiff) {
        return [
            {str: firstLinePrefix + '[', type: 'same'},
            ...diff.items.map((itemDiff, index) => {
                if (leaveSpace && itemDiff.type === DiffType.added && viewSide === 'old') {
                    return toEmptyLines(itemDiff.newValue, 'same');
                }
                if (leaveSpace && itemDiff.type === DiffType.removed && viewSide === 'new') {
                    return toEmptyLines(itemDiff.originalValue, 'same');
                }
                const propDiffLines = identLines(diffToLines({
                    diff: itemDiff,
                    viewSide,
                    ident,
                    hideSame,
                }), ident);
                if (index < diff.items.length - 1 && propDiffLines.length > 0) {
                    propDiffLines[propDiffLines.length - 1].str += ',';
                }
                return propDiffLines;
            }).flat(1),
            {str: ']', type: 'same'},
        ];
    }
    const _: never = diff;
    throw new Error('unknown type');
}
