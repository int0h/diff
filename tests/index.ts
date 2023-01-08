import test from 'tape';
import {applyLcsPatch, calcLcs, DiffItemType} from '../';

type LcsCase = {
    os: string;
    ns: string;
    lcs: string;
    diff: string;
}

test('lcs tests', t => {
    const cases: LcsCase[] = [
        {
            os: 'abc',
            ns: 'abcD',
            lcs: 'abc',
            diff: 'abc[+D]'
        },
        {
            os: 'abc',
            ns: 'aBcD',
            lcs: 'ac',
            diff: 'a[+B][-b]c[+D]',
        },
        {
            os: 'abcdef',
            ns: 'def',
            lcs: 'def',
            diff: '[-a][-b][-c]def',
        },
        {
            os: '',
            ns: 'abc',
            lcs: '',
            diff: '[+a][+b][+c]',
        },
        {
            os: 'abc',
            ns: '',
            lcs: '',
            diff: '[-a][-b][-c]',
        },
        {
            os: 'abc',
            ns: '1a1b1c',
            lcs: 'abc',
            diff: '[+1]a[+1]b[+1]c',
        },
        {
            os: 'abc',
            ns: 'aaabbbccc',
            lcs: 'abc',
            diff: '[+a][+a]a[+b][+b]b[+c][+c]c',
        }
    ];

    cases.forEach(c => {
        const a = c.os.split('');
        const b = c.ns.split('');
        const res = calcLcs(a, b);
        t.equal(res.seq.join(''), c.lcs, `LCS(${c.os}, ${c.ns}) -> ${c.lcs}`);
        const diffStr = res.diff
            .map(i => {
                if (i.o === DiffItemType.added) {
                    return `[+${i.v}]`;
                } else if (i.o === DiffItemType.removed) {
                    return `[-${i.v}]`;
                } else {
                    return i.v;
                }
            })
            .join('')
        t.equal(diffStr, c.diff, `DIFF(${c.os}, ${c.ns}) -> ${diffStr} EXPECT ${c.diff}`);
        t.equal(applyLcsPatch(res.diff).join(''), c.ns);
    });

    t.end();
});
