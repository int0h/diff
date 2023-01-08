import { calcLcs } from "..";

const genAlphabet = (fromChar: string, toChar: string) => {
    const alphabetArray: string[] = [];
    const fromCode = fromChar.charCodeAt(0);
    const toCode = toChar.charCodeAt(0);
    for (let i = fromCode; i <= toCode; i++) {
        alphabetArray.push(String.fromCharCode(i));
    }
    return alphabetArray;
};

const lowerAlphabet = genAlphabet('a', 'z');
const upperAlphabet = genAlphabet('A', 'Z');

function makeRnd(startSeed = 0) {
    let seed = startSeed;

    return () => {
        return Math.sin(seed++ * 10000) / 2 + 0.5;
    }
}

const rnd = makeRnd();

function generateIndex(length: number, rnd: () => number) {
    const x = rnd();
    console.log(x);
    return Math.floor(x * length);
}

function genText() {}

function generateRandomString(possibleCharacters: string[], length: number, rnd: () => number) {
    let randomString = '';

    for (let i = 0; i < length; i++) {
    //   const index = generateIndex(possibleCharacters.length, rnd);
        const index = i % possibleCharacters.length;
        randomString += possibleCharacters[index];
    }

    return randomString;
}

type LcsTestCase = {
    sourceStr: string;
    targetStr: string;
    lcs: number;
}

function insertChar(str: string, pos: number, char: string) {
    return str.slice(0, pos) + char + str.slice(pos);
}

function removeChar(str: string, pos: number) {
    return str.slice(0, pos) + str.slice(pos + 1);
}

function mutateStr(str: string, mutations: number, rnd: () => number) {
    const removeMutations = Math.min(Math.floor(mutations / 2), str.length);
    for (let i = 0; i < removeMutations; i++) {
        str = removeChar(str, generateIndex(str.length, rnd));
    }
    for (let i = 0; i < (mutations - removeMutations); i++) {
        str = insertChar(str, generateIndex(str.length, rnd), upperAlphabet[i % upperAlphabet.length]);
    }
    return str;
}

function generateLcsTestCases(rnd: () => number): LcsTestCase[] {
    const cases: LcsTestCase[] = [];

    for (let i = 0; i < 10; i++) {
        const sourceStr = generateRandomString(lowerAlphabet, 10, rnd);
        const lcs = generateIndex(30, rnd);
        const targetStr = mutateStr(sourceStr, lcs, rnd);
        cases.push({lcs, sourceStr, targetStr});
    }

    return cases;
}

console.log(generateLcsTestCases(makeRnd()));

console.log(calcLcs('a'.split(' '), []));
