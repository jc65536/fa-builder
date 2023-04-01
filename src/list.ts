export type List<T> = {
    val: T,
    next: List<T>
};

export const cons = <T>(val: T) => (next: List<T>): List<T> => ({ val, next });

export const member = <T>(elem: T) => (ls: List<T>): boolean =>
    ls !== null && (ls.val === elem || member(elem)(ls.next));

export const fold = <T, U>(f: (_a: T, _b: U) => T) =>
    (init: T) => (ls: List<U>): T =>
        ls === null ? init : fold(f)(f(init, ls.val))(ls.next);
