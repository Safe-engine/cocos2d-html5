/****************************************************************************
 * Converted to ES Module and TypeScript by GitHub Copilot
 ****************************************************************************/

// Main namespace
export const cc: any = {};
cc._tmp = cc._tmp || {};
cc._LogInfos = {};

type Iterator<T> = (value: T, index: number | string) => void | boolean;

// Utility functions
cc.each = function <T>(obj: T[] | Record<string, T>, iterator: Iterator<T>, context?: any): void {
    if (!obj) return;
    if (Array.isArray(obj)) {
        for (let i = 0, li = obj.length; i < li; i++) {
            if (iterator.call(context, obj[i], i) === false) return;
        }
    } else {
        for (const key in obj) {
            if (iterator.call(context, obj[key], key) === false) return;
        }
    }
};

cc.extend = function <T extends object, S extends object[]>(target: T, ...sources: S): T & S[number] {
    cc.each(sources, (src: any) => {
        for (const key in src) {
            if (Object.prototype.hasOwnProperty.call(src, key)) {
                (target as any)[key] = src[key];
            }
        }
    });
    return target as T & S[number];
};

cc.inherits = function (childCtor: Function, parentCtor: Function): void {
    function tempCtor() {}
    tempCtor.prototype = parentCtor.prototype;
    (childCtor as any).superClass_ = parentCtor.prototype;
    childCtor.prototype = new (tempCtor as any)();
    childCtor.prototype.constructor = childCtor;
};

cc.isFunction = function (obj: any): obj is Function {
    return typeof obj === 'function';
};
cc.isNumber = function (obj: any): obj is number {
    return typeof obj === 'number' || Object.prototype.toString.call(obj) === '[object Number]';
};
cc.isString = function (obj: any): obj is string {
    return typeof obj === 'string' || Object.prototype.toString.call(obj) === '[object String]';
};
cc.isArray = function (obj: any): obj is any[] {
    return Array.isArray(obj) ||
        (typeof obj === 'object' && Object.prototype.toString.call(obj) === '[object Array]');
};
cc.isUndefined = function (obj: any): obj is undefined {
    return typeof obj === 'undefined';
};
cc.isObject = function (obj: any): obj is object {
    return typeof obj === "object" && Object.prototype.toString.call(obj) === '[object Object]';
};
cc.isCrossOrigin = function (url: string): boolean {
    if (!url) {
        cc.log("invalid URL");
        return false;
    }
    const startIndex = url.indexOf("://");
    if (startIndex === -1) return false;
    const endIndex = url.indexOf("/", startIndex + 3);
    const urlOrigin = (endIndex === -1) ? url : url.substring(0, endIndex);
    return urlOrigin !== location.origin;
};

// AsyncPool and cc.async
type AsyncIterator<T> = (value: T, index: number, cb: (err: any, result?: any) => void, pool: any) => void;
type AsyncEnd = (errors: any, results: any) => void;

class AsyncPool<T> {
    _finished = false;
    _srcObj: T[] | Record<string, T>;
    _limit: number;
    _pool: { index: number | string, value: T }[] = [];
    _iterator: AsyncIterator<T>;
    _iteratorTarget: any;
    _onEnd: AsyncEnd;
    _onEndTarget: any;
    _results: any;
    _errors: any;
    size: number;
    finishedSize = 0;
    _workingSize = 0;

    constructor(srcObj: T[] | Record<string, T>, limit: number, iterator: AsyncIterator<T>, onEnd: AsyncEnd, target: any) {
        this._srcObj = srcObj;
        this._limit = limit || 0;
        this._iterator = iterator;
        this._iteratorTarget = target;
        this._onEnd = onEnd;
        this._onEndTarget = target;
        this._results = Array.isArray(srcObj) ? [] : {};
        this._errors = Array.isArray(srcObj) ? [] : {};

        cc.each(srcObj, (value, index) => {
            this._pool.push({ index, value });
        });

        this.size = this._pool.length;
        this._limit = this._limit || this.size;
    }

    _handleItem() {
        if (this._pool.length === 0 || this._workingSize >= this._limit) return;
        const item = this._pool.shift()!;
        const value = item.value, index = item.index;
        this._workingSize++;
        this._iterator.call(this._iteratorTarget, value, index,
            ((err: any, result: any) => {
                if (this._finished) return;
                if (err) this._errors[item.index] = err;
                else this._results[item.index] = result;
                this.finishedSize++;
                this._workingSize--;
                if (this.finishedSize === this.size) {
                    const errors = (Array.isArray(this._errors) && this._errors.length === 0) ? null : this._errors;
                    this.onEnd(errors, this._results);
                    return;
                }
                this._handleItem();
            }).bind(this)
        , this);
    }

    flow() {
        if (this._pool.length === 0) {
            if (this._onEnd)
                this._onEnd.call(this._onEndTarget, null, []);
            return;
        }
        for (let i = 0; i < this._limit; i++)
            this._handleItem();
    }

    onEnd(errors: any, results: any) {
        this._finished = true;
        if (this._onEnd) {
            const selector = this._onEnd;
            const target = this._onEndTarget;
            this._onEnd = null as any;
            this._onEndTarget = null as any;
            selector.call(target, errors, results);
        }
    }
}

cc.AsyncPool = AsyncPool;

cc.async = {
    series<T>(tasks: ((cb: (err?: any) => void) => void)[], cb?: AsyncEnd, target?: any) {
        const asyncPool = new AsyncPool(tasks, 1, (func, index, cb1) => {
            func.call(target, cb1);
        }, cb!, target);
        asyncPool.flow();
        return asyncPool;
    },
    parallel<T>(tasks: ((cb: (err?: any) => void) => void)[], cb: AsyncEnd, target?: any) {
        const asyncPool = new AsyncPool(tasks, 0, (func, index, cb1) => {
            func.call(target, cb1);
        }, cb, target);
        asyncPool.flow();
        return asyncPool;
    },
    waterfall<T>(tasks: ((...args: any[]) => void)[], cb: AsyncEnd, target?: any) {
        let args: any[] = [];
        let lastResults: any[] = [null];
        const asyncPool = new AsyncPool(tasks, 1,
            function (func, index, cb1) {
                args.push(function (err: any) {
                    args = Array.prototype.slice.call(arguments, 1);
                    if (tasks.length - 1 === index) lastResults = lastResults.concat(args);
                    cb1.apply(null, arguments);
                });
                func.apply(target, args);
            }, function (err: any) {
                if (!cb) return;
                if (err) return cb.call(target, err);
                cb.apply(target, lastResults);
            }, target);
        asyncPool.flow();
        return asyncPool;
    },
    map<T>(tasks: T[], iterator: AsyncIterator<T> | { iterator: AsyncIterator<T>, cb: AsyncEnd, iteratorTarget: any }, callback?: AsyncEnd, target?: any) {
        let locIterator = iterator as AsyncIterator<T>;
        if (typeof iterator === "object") {
            callback = iterator.cb;
            target = iterator.iteratorTarget;
            locIterator = iterator.iterator;
        }
        const asyncPool = new AsyncPool(tasks, 0, locIterator, callback!, target);
        asyncPool.flow();
        return asyncPool;
    },
    mapLimit<T>(tasks: T[], limit: number, iterator: AsyncIterator<T>, cb: AsyncEnd, target?: any) {
        const asyncPool = new AsyncPool(tasks, limit, iterator, cb, target);
        asyncPool.flow();
        return asyncPool;
    }
};

// Path utilities
cc.path = {
    normalizeRE: /[^\.\/]+\/\.\.\//,
    join: function (...args: string[]): string {
        let result = "";
        for (let i = 0, l = args.length; i < l; i++) {
            result = (result + (result === "" ? "" : "/") + args[i]).replace(/(\/|\\\\)$/, "");
        }
        return result;
    },
    extname: function (pathStr: string): string | null {
        const temp = /(\.[^\.\/\?\\]*)(\?.*)?$/.exec(pathStr);
        return temp ? temp[1] : null;
    },
    mainFileName: function (fileName: string): string {
        if (fileName) {
            const idx = fileName.lastIndexOf(".");
            if (idx !== -1)
                return fileName.substring(0, idx);
        }
        return fileName;
    },
    basename: function (pathStr: string, extname?: string): string | null {
        const index = pathStr.indexOf("?");
        if (index > 0) pathStr = pathStr.substring(0, index);
        const reg = /(\/|\\\\)([^(\/|\\\\)]+)$/g;
        const result = reg.exec(pathStr.replace(/(\/|\\\\)$/, ""));
        if (!result) return null;
        let baseName = result[2];
        if (extname && pathStr.substring(pathStr.length - extname.length).toLowerCase() === extname.toLowerCase())
            return baseName.substring(0, baseName.length - extname.length);
        return baseName;
    },
    dirname: function (pathStr: string): string {
        return pathStr.replace(/((.*)(\/|\\|\\\\))?(.*?\..*$)?/, '$2');
    },
    changeExtname: function (pathStr: string, extname?: string): string {
        extname = extname || "";
        let index = pathStr.indexOf("?");
        let tempStr = "";
        if (index > 0) {
            tempStr = pathStr.substring(index);
            pathStr = pathStr.substring(0, index);
        }
        index = pathStr.lastIndexOf(".");
        if (index < 0) return pathStr + extname + tempStr;
        return pathStr.substring(0, index) + extname + tempStr;
    },
    changeBasename: function (pathStr: string, basename: string, isSameExt?: boolean): string {
        if (basename.indexOf(".") === 0) return this.changeExtname(pathStr, basename);
        let index = pathStr.indexOf("?");
        let tempStr = "";
        let ext = isSameExt ? this.extname(pathStr) : "";
        if (index > 0) {
            tempStr = pathStr.substring(index);
            pathStr = pathStr.substring(0, index);
        }
        index = pathStr.lastIndexOf("/");
        index = index <= 0 ? 0 : index + 1;
        return pathStr.substring(0, index) + basename + ext + tempStr;
    },
    _normalize: function (url: string): string {
        let oldUrl = url = String(url);
        do {
            oldUrl = url;
            url = url.replace(this.normalizeRE, "");
        } while (oldUrl.length !== url.length);
        return url;
    }
};

// Loader stub (for brevity, only type and structure, not full implementation)
cc.loader = {
    resPath: "",
    audioPath: "",
    cache: {},
    getXMLHttpRequest: function (): XMLHttpRequest {
        const xhr = window.XMLHttpRequest ? new window.XMLHttpRequest() : new (window as any).ActiveXObject("MSXML2.XMLHTTP");
        xhr.timeout = 10000;
        return xhr;
    },
    // ... (implement other loader methods as needed)
};

// Format string utility
cc.formatStr = function (...args: any[]): string {
    let l = args.length;
    if (l < 1) return "";
    let str = args[0];
    let needToFormat = typeof str !== "object";
    for (let i = 1; i < l; ++i) {
        let arg = args[i];
        if (needToFormat) {
            while (true) {
                let result = null;
                if (typeof arg === "number") {
                    result = str.match(/(%d)|(%s)/);
                    if (result) {
                        str = str.replace(/(%d)|(%s)/, arg);
                        break;
                    }
                }
                result = str.match(/%s/);
                if (result)
                    str = str.replace(/%s/, arg);
                else
                    str += "    " + arg;
                break;
            }
        } else
            str += "    " + arg;
    }
    return str;
};

// Polyfill for Function.prototype.bind
if (!Function.prototype.bind) {
    Function.prototype.bind = function (oThis: any, ...args: any[]) {
        if (!cc.isFunction(this)) {
            throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
        }
        const fToBind = this;
        const fNOP = function () {};
        const fBound = function (this: any, ...bindArgs: any[]) {
            return fToBind.apply(
                this instanceof fNOP && oThis ? this : oThis,
                args.concat(bindArgs)
            );
        };
        fNOP.prototype = this.prototype;
        fBound.prototype = new (fNOP as any)();
        return fBound;
    };
}