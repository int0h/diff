import test from 'tape';
import {calcDiff, diffToLines, DiffJsonLine} from '../';

/** fixes tabs for strings */
function unTab(str: TemplateStringsArray, ...parts: string[]) {
    if (parts.length > 0) {
        throw new Error('parts are not supported');
    }
    const lines = str
        .join('')
        .split('\n')
        .slice(1, -1); // first and last lines are always '\n' + some spaces

    if (lines.length <= 0) {
        throw new Error('empty');
    }

    const baseIdent = /^\ */.exec(lines[0])?.[0] ?? '';

    return lines
        .map(l => l.slice(baseIdent.length))
        .join('\n');
}

function printDiff(a: any, b: any, side: 'old' | 'new' | 'unified'): string {
    const diff = calcDiff(a, b);
    const lines = diffToLines({diff, ident: '    ', viewSide: side, leaveSpace: true});
    const res = lines.map(l => {
        if (l.type === 'same') {
            return '| ' + l.str;
        } else if (l.type === 'added') {
            return '+ ' + l.str;
        } else {
            return '- ' + l.str;
        }
    }).join('\n');
    console.log(res);
    return res;
}

test('diff+print tests', t => {
    t.is(
        printDiff(
            {
                apple: 1,
                orange: 2,
            },
            {
                apple: 1,
                orange: 3,
            },
            'unified',
        ),
        unTab`
        | {
        |     "apple": 1,
        -     "orange": 2
        +     "orange": 3
        | }
        `,
        'added prop'
    );

    t.is(
        printDiff(
            {
                age: 123,
                items: [
                    {a: 1},
                    {b: 2},
                    {c: 3},
                ]
            },
            {
                age: 123,
                items: [
                    {a: 1},
                    {b: 22},
                    {c: 3},
                ]
            },
            'unified',
        ),
        unTab`
        | {
        |     "age": 123,
        |     "items": [
        |         {
        |             "a": 1
        |         },
        |         {
        -             "b": 2
        +             "b": 22
        |         },
        |         {
        |             "c": 3
        |         }
        |     ]
        | }
        `,
        'changed array item'
    );

    t.is(
        printDiff(
            {
                age: 123,
                items: [
                    {a: 1},
                    {b: 2},
                    {c: 3},
                ]
            },
            {
                age: 123,
                items: [
                    {a: 1},
                    {c: 3},
                ]
            },
            'unified',
        ),
        unTab`
        | {
        |     "age": 123,
        |     "items": [
        |         {
        |             "a": 1
        |         },
        -         {
        -             "b": 2
        -         },
        |         {
        |             "c": 3
        |         }
        |     ]
        | }
        `,
        'removed array item'
    );

    t.is(
        printDiff(
            {
                age: 123,
                items: [
                    {a: 1},
                    {b: 2},
                ]
            },
            {
                age: 123,
                items: [
                    {a: 1},
                    {b: 2},
                ]
            },
            'unified',
        ),
        unTab`
        | {
        |     "age": 123,
        |     "items": [
        |         {
        |             "a": 1
        |         },
        |         {
        |             "b": 2
        |         }
        |     ]
        | }
        `,
        'unchanged'
    );

    t.is(
        printDiff(
            {
                age: 123,
                items: [
                    {a: 1},
                    {c: 3},
                ]
            },
            {
                age: 123,
                items: [
                    {a: 1},
                    {b: 2},
                    {c: 3},
                ]
            },
            'unified',
        ),
        unTab`
        | {
        |     "age": 123,
        |     "items": [
        |         {
        |             "a": 1
        |         },
        +         {
        +             "b": 2
        +         },
        |         {
        |             "c": 3
        |         }
        |     ]
        | }
        `,
        'added array item'
    );

    t.is(
        printDiff(
            {
                a: 123,
                b: 'string',
                c: true,
                d: null,
                e: {e1: 1, e2: {e10: 'hi'}},
                items: [
                    {a: 1},
                    null,
                ],
                unchanged: {
                    a: 1,
                },
                emptyObj: {},
            },
            {
                a: 456,
                b: 'new-string',
                c: false,
                d: {},
                e: {e1: 2, e2: {e10: 'hello'}},
                items: [
                    {b: 1},
                    null,
                ],
                unchanged: {
                    a: 1,
                },
                emptyObj: {},
            },
            'unified',
        ),
        unTab`
        | {
        -     "a": 123
        +     "a": 456,
        -     "b": "string"
        +     "b": "new-string",
        -     "c": true
        +     "c": false,
        -     "d": null
        +     "d": {},
        |     "e": {
        -         "e1": 1
        +         "e1": 2,
        |         "e2": {
        -             "e10": "hi"
        +             "e10": "hello"
        |         }
        |     },
        |     "items": [
        |         {
        -             "a": 1,
        +             "b": 1
        |         },
        |         null
        |     ],
        |     "unchanged": {
        |         "a": 1
        |     },
        |     "emptyObj": {}
        | }
        `,
        'different types'
    );


    t.end();
});
