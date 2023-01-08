/**
 * @see https://en.wikipedia.org/wiki/Longest_common_subsequence
 * @see https://www.ics.uci.edu/~eppstein/161/960229.html
 * @see https://www.enjoyalgorithms.com/blog/longest-common-subsequence
 * @see https://florian.github.io/diffing/
 * @see https://www.youtube.com/watch?v=ASoaQq66foQ
 */

type DiffItem<T> = {o: 'added' | 'removed' | 'same', v: T};

type LcsResult<T> = {seq: T[], len: number, diff: Array<DiffItem<T>>};

export function calcLcs<T>(x: T[], y: T[], xl: number = x.length, yl: number = y.length, cache: Record<number, LcsResult<T>> = {}): LcsResult<T> {
    if (xl === 0) {
        return {
            len: 0,
            seq: [],
            diff: y.slice(0, yl).map(v => ({o: 'added', v})),
        };
    }
    if (yl === 0) {
        return {
            len: 0,
            seq: [],
            diff: x.slice(0, xl).map(v => ({o: 'removed', v})),
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
            diff: r.diff.concat({o: 'same', v: x[xl - 1]}),
        };
    } else {
        const r1 = calcLcs(x, y, xl, yl - 1, cache);
        const r2 = calcLcs(x, y, xl - 1, yl, cache);
        if (r1.len > r2.len) {
            cache[cacheKey] = {
                len: r1.len,
                seq: r1.seq,
                diff: r1.diff.concat({o: 'added', v: y[yl - 1]})
            };
        } else {
            cache[cacheKey] = {
                len: r2.len,
                seq: r2.seq,
                diff: r2.diff.concat({o: 'removed', v: x[xl - 1]})
            };
        }
    }
    return cache[cacheKey];
}

export function applyLcsPatch<T>(diff: DiffItem<T>[]): T[] {
    return diff
        .filter(i => i.o === 'added' || i.o === 'same')
        .map(i => i.v);
}


type CompactDiffItem<T> = {o: 'added', nv: T} | {o: 'removed', ov: T} | {o: 'same', v: T} | {o: 'modified', ov: T, nv: T};

export function compactDiff<T>(lcsDiff: DiffItem<T>[]): CompactDiffItem<T>[] {
    const result: CompactDiffItem<T>[] = [];
    let curAdded: T[] = [];
    let curRemoved: T[] = [];

    function flush() {
        for (let i = 0; i < Math.max(curAdded.length, curRemoved.length); i++) {
            if (i >= curAdded.length) {
                result.push({o: 'removed', ov: curRemoved[i]});
            } else if (i >= curRemoved.length) {
                result.push({o: 'added', nv: curAdded[i]});
            } else {
                result.push({o: 'modified', ov: curRemoved[i], nv: curAdded[i]});
            }
        }
        curAdded = [];
        curRemoved = [];
    }

    lcsDiff.forEach(diffItem => {
        if (diffItem.o === 'same') {
            flush();
            result.push({o: 'same', v: diffItem.v});
            return;
        }
        if (diffItem.o === 'added') {
            curAdded.push(diffItem.v);
        }
        if (diffItem.o === 'removed') {
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

function compactDiffMap<T, R>(cd: CompactDiffItem<T>[], fn: (input: T) => R): CompactDiffItem<R>[] {
    return cd.map(i => {
        const opType = i.o;
        if (opType === 'added') {
            return {
                o: 'added',
                nv: fn(i.nv),
            };
        } else if (opType === 'removed') {
            return {
                o: 'removed',
                ov: fn(i.ov),
            };
        } else if (opType === 'modified') {
            return {
                o: 'modified',
                ov: fn(i.ov),
                nv: fn(i.nv),
            };
        } else if (opType === 'same') {
            return {
                o: 'same',
                v: fn(i.v),
            };
        }
        const _: never = opType;
        throw new Error('invalid diff item type');
    });
}

export function calcJsonArrayDiff(a1: any[], a2: any[]) {
    const hashStore = new JsonHashStore();

    const a1Hashed = a1.map(i => hashStore.encode(i));
    const a2Hashed = a2.map(i => hashStore.encode(i));

    const lcsDiff = calcLcs(a1Hashed, a2Hashed);
    const compactedDiff = compactDiff(lcsDiff.diff);

    return compactDiffMap(compactedDiff, id => {
        return hashStore.decode(id);
    });
};
