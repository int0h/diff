/**
 * @see https://en.wikipedia.org/wiki/Longest_common_subsequence
 * @see https://www.ics.uci.edu/~eppstein/161/960229.html
 * @see https://www.enjoyalgorithms.com/blog/longest-common-subsequence
 * @see https://florian.github.io/diffing/
 * @see https://www.youtube.com/watch?v=ASoaQq66foQ
 */

export enum DiffItemType {
    added,
    removed,
    same,
}

type DiffItem<T> = {o: DiffItemType, v: T};

type LcsResult<T> = {seq: T[], len: number, diff: Array<DiffItem<T>>};

/**
 * Calculates the Longest Common Subsequence of 2 arrays.
 * It also calculates the diff of x -> y along the way.
 * @param x first array
 * @param y second array
 * @param xl starting length of x
 * @param yl starting length of y
 * @param cache
 * @returns
 */
export function calcLcs<T extends number | string>(x: T[], y: T[], xl: number = x.length, yl: number = y.length, cache: Record<number, LcsResult<T>> = {}): LcsResult<T> {
    if (xl === 0) {
        return {
            len: 0,
            seq: [],
            diff: y.slice(0, yl).map(v => ({o: DiffItemType.added, v})),
        };
    }
    if (yl === 0) {
        return {
            len: 0,
            seq: [],
            diff: x.slice(0, xl).map(v => ({o: DiffItemType.removed, v})),
        };
    }
    const cacheKey = yl * x.length + xl;
    if (cache[cacheKey]) {
        return cache[cacheKey];
    }
    if (x[xl - 1] === y[yl - 1]) {
        const r = calcLcs(x, y, xl - 1, yl - 1, cache);
        cache[cacheKey] = {
            len: 1 + r.len,
            seq: r.seq.concat(x[xl - 1]),
            diff: r.diff.concat({o: DiffItemType.same, v: x[xl - 1]}),
        };
    } else {
        const r1 = calcLcs(x, y, xl, yl - 1, cache);
        const r2 = calcLcs(x, y, xl - 1, yl, cache);
        if (r1.len > r2.len) {
            cache[cacheKey] = {
                len: r1.len,
                seq: r1.seq,
                diff: r1.diff.concat({o: DiffItemType.added, v: y[yl - 1]})
            };
        } else {
            cache[cacheKey] = {
                len: r2.len,
                seq: r2.seq,
                diff: r2.diff.concat({o: DiffItemType.removed, v: x[xl - 1]})
            };
        }
    }
    return cache[cacheKey];
}

export function applyLcsPatch<T>(diff: DiffItem<T>[]): T[] {
    return diff
        .filter(i => i.o === DiffItemType.added || i.o === DiffItemType.same)
        .map(i => i.v);
}

export enum CompactDiffItemType {
    added,
    removed,
    same,
    modified,
}

type CompactDiffItem<T> =
    | {o: CompactDiffItemType.added, nv: T}
    | {o: CompactDiffItemType.removed, ov: T}
    | {o: CompactDiffItemType.same, v: T}
    | {o: CompactDiffItemType.modified, ov: T, nv: T};

/**
 * By default LcsDiff uses only adding and removal operations.
 * So it means that diff of [0, A, A, A, 0] -> [0, B, B, B, C, 0]
 * will be something like [0, -A, -A, -A, +B, +B, +B, +C, 0].
 *
 * This function adds a new operation: 'modified'. So the same diff will be
 * transformed to [0, A->B, A->B, A->B, +C, 0].
 * @param lcsDiff
 * @returns
 */
export function compactDiff<T extends number | string>(lcsDiff: DiffItem<T>[]): CompactDiffItem<T>[] {
    const result: CompactDiffItem<T>[] = [];
    let curAdded: T[] = [];
    let curRemoved: T[] = [];

    function flush() {
        for (let i = 0; i < Math.max(curAdded.length, curRemoved.length); i++) {
            if (i >= curAdded.length) {
                result.push({o: CompactDiffItemType.removed, ov: curRemoved[i]});
            } else if (i >= curRemoved.length) {
                result.push({o: CompactDiffItemType.added, nv: curAdded[i]});
            } else {
                result.push({o: CompactDiffItemType.modified, ov: curRemoved[i], nv: curAdded[i]});
            }
        }
        curAdded = [];
        curRemoved = [];
    }

    lcsDiff.forEach(diffItem => {
        if (diffItem.o === DiffItemType.same) {
            flush();
            result.push({o: CompactDiffItemType.same, v: diffItem.v});
            return;
        }
        if (diffItem.o === DiffItemType.added) {
            curAdded.push(diffItem.v);
        }
        if (diffItem.o === DiffItemType.removed) {
            curRemoved.push(diffItem.v);
        }
    });

    flush();

    return result;
}

class JsonHashStore {
    private currentId = 0;
    private jsonToIdMap = new Map<string, number>();
    private idToJsonMap = new Map<number, string>();

    encode(item: any): number {
        const json = JSON.stringify(item);
        if (this.jsonToIdMap.has(json)) {
            return this.jsonToIdMap.get(json)!;
        }
        const id = this.currentId++;
        this.jsonToIdMap.set(json, id);
        this.idToJsonMap.set(id, json);
        return id;
    }

    decode(id: number) {
        if (!this.idToJsonMap.has(id)) {
            throw new Error('cannot resolve id');
        }
        return JSON.parse(this.idToJsonMap.get(id)!);
    }
}

export function compactDiffMap<T, R>(cd: CompactDiffItem<T>[], fn: (input: T) => R): CompactDiffItem<R>[] {
    return cd.map(i => {
        const opType = i.o;
        if (opType === CompactDiffItemType.added) {
            return {
                o: CompactDiffItemType.added,
                nv: fn(i.nv),
            };
        } else if (opType === CompactDiffItemType.removed) {
            return {
                o: CompactDiffItemType.removed,
                ov: fn(i.ov),
            };
        } else if (opType === CompactDiffItemType.modified) {
            return {
                o: CompactDiffItemType.modified,
                ov: fn(i.ov),
                nv: fn(i.nv),
            };
        } else if (opType === CompactDiffItemType.same) {
            return {
                o: CompactDiffItemType.same,
                v: fn(i.v),
            };
        }
        const _: never = opType;
        throw new Error('invalid diff item type');
    });
}

/**
 * Calculates the diff for arrays of objects.
 *
 * While `calcLcs` works with primitive types that support
 * `===` properly it will work worse with objects.
 *
 * `calcJsonArrayDiff` uses a `hashing` algorithm to encode array of
 * JSONable objects to primitive values, calculates the diff and decode it back;
 * @param fromArray
 * @param toArray
 * @returns
 */
export function calcJsonArrayDiff<T>(fromArray: T[], toArray: T[]): CompactDiffItem<T>[] {
    const hashStore = new JsonHashStore();

    const a1Hashed = fromArray.map(i => hashStore.encode(i));
    const a2Hashed = toArray.map(i => hashStore.encode(i));

    const lcsDiff = calcLcs(a1Hashed, a2Hashed);
    const compactedDiff = compactDiff(lcsDiff.diff);

    return compactDiffMap(compactedDiff, id => {
        return hashStore.decode(id);
    });
};
