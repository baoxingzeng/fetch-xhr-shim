import { EventP, Event_setTrusted } from "./EventP";
import { _Symbol, className, setState, isPolyfillType, checkArgsLength } from "../utils";

export class EventTargetP implements EventTarget {
    constructor() {
        setState(this, "__EventTarget__", new EventTargetState());
    }

    /** @internal */ declare readonly __EventTarget__: EventTargetState;

    addEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: AddEventListenerOptions | boolean): void {
        checkArgsLength(arguments.length, 2, className(this), "addEventListener");
        if (typeof callback !== "function" && typeof callback !== "object" && callback !== undefined) {
            throw new TypeError(`Failed to execute 'addEventListener' on '${className(this)}': parameter 2 is not of type 'Object'.`);
        }

        let s = state(this) || { executors: [] };
        let executor = new Executor(type, callback);
        let capture = executor.options.capture = typeof options === "boolean" ? options : !!options?.capture;

        if (!s.executors.some(function (x) { return x.equals(executor); })) {
            s.executors.push(executor);
            if (options && typeof options === "object") {
                executor.options.once = !!options.once;
                executor.options.passive = !!options.passive;
                const signal = options.signal;

                if (signal && isEventTarget(signal) && !signal.aborted) {
                    executor.options.signal = signal;
                    whenAbort(this, executor, signal);
                }
            }
            if (capture) {
                let f = function (v: Executor) { return !!v.options.capture ? 0 : 1; }
                s.executors = s.executors.sort(function (a, b) { return f(a) - f(b); });
            }
        }
    }

    dispatchEvent(event: Event): boolean {
        checkArgsLength(arguments.length, 1, className(this), "dispatchEvent");
        if (isPolyfillType<Event>("Event", event)) {
            Event_setTrusted(event, false);
        } else if (!isEvent(event)) {
            throw new TypeError(`Failed to execute 'dispatchEvent' on '${className(this)}': parameter 1 is not of type 'Event'.`);
        } else {
            console.warn(`WARNING: undefined behavior when executing 'dispatchEvent' on '${className(this)}': parameter 1 is not of type 'Event(P)'.`);
        }

        return EventTarget_dispatchEvent(this, event);
    }

    removeEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: EventListenerOptions | boolean): void {
        checkArgsLength(arguments.length, 2, className(this), "removeEventListener");
        if (typeof callback !== "function" && typeof callback !== "object" && callback !== undefined) {
            throw new TypeError(`Failed to execute 'removeEventListener' on '${className(this)}': parameter 2 is not of type 'Object'.`);
        }

        let s = state(this) || { executors: [] };
        let executor = new Executor(type, callback);
        executor.options.capture = typeof options === "boolean" ? options : !!options?.capture;

        if (s.executors.some(function (x) { return x.equals(executor); })) {
            s.executors = s.executors.filter(function (x) { return !x.equals(executor); });
        }
    }

    /** @internal */ toString() { return "[object EventTarget]"; }
    /** @internal */ get [_Symbol.toStringTag]() { return "EventTarget"; }
    /** @internal */ get __MPHTTPX__() { return { chain: ["EventTarget"] }; }
}

/** @internal */
class EventTargetState {
    executors: Executor[] = [];
}

function state(target: EventTargetP) {
    return target.__EventTarget__;
}

function isEvent(value: unknown): value is Event {
    const predicate = function (str: string) { return "[object " === str.slice(0, 8) && str.slice(-6) === "Event]"; }

    return !!value
        && typeof value === "object"
        && (predicate(Object.prototype.toString.call(value)) || predicate(String(value)))
        && "type" in value
        && typeof value.type === "string";
}

function whenAbort(target: EventTargetP, executor: Executor, signal: AbortSignal) {
    const onAbort = function () {
        state(target).executors = state(target).executors.filter(function (x) { return !x.equals(executor); });
        signal.removeEventListener("abort", onAbort);
    }
    signal.addEventListener("abort", onAbort);
}

/** @internal */
class Executor {
    constructor(type: string, callback: EventListenerOrEventListenerObject | null) {
        this.type = "" + type;
        this.callback = extract(callback);
    }

    type: string;
    callback: EventListener | null;
    options: AddEventListenerOptions = {};

    equals(executor: Executor) {
        return this.type === executor.type
            && this.callback === executor.callback
            && this.options.capture === executor.options.capture;
    }
}

function extract(cb: EventListenerOrEventListenerObject | null): EventListener | null {
    return typeof cb === "function" ? cb : isEventListenerObject(cb) ? cb.handleEvent : cb;
}

function isEventListenerObject(cb: EventListenerObject | null): cb is EventListenerObject {
    return !!cb && typeof cb === "object" && "handleEvent" in cb && typeof cb.handleEvent === "function";
}

export function EventTarget_dispatchEvent(target: EventTarget, event: Event) {
    const s = state(target as EventTargetP) || {};
    const evs = (event as EventP).__Event__ || {};

    evs.target = target;
    evs.currentTarget = target;
    evs.eventPhase = 2 /* AT_TARGET */;
    evs.eventDispatched = true;

    let onceIndexes: number[] = [];
    if (!Array.isArray(s.executors)) { s.executors = []; }
    for (let i = 0; i < s.executors.length; ++i) {
        if (evs.immediatePropagationStopped) break;

        let executor = s.executors[i]!;
        if (executor.type !== event.type) continue;
        if (executor.options.once) onceIndexes.push(i);

        evs.passive = !!executor.options.passive;

        try {
            let cb = executor.callback;
            if (typeof cb === "function") cb.call(target, event);
        } catch (e) {
            console.error(e);
        }

        evs.passive = false;
    }

    if (onceIndexes.length > 0) {
        s.executors = s.executors.reduce(function (acc: Executor[], cur, index) {
            if (onceIndexes.indexOf(index) === -1) acc.push(cur);
            return acc;
        }, []);
    }

    evs.currentTarget = null;
    evs.eventPhase = 0 /* NONE */;
    evs.eventDispatched = false;

    return !(event.cancelable && event.defaultPrevented);
}

export function attachFn<
    T extends EventTarget & Record<`on${K}`, ((ev: any) => any) | null>,
    K extends string,
>(
    target: T,
    handlers: Record<`on${K}`, (ev: any) => void>
) {
    return function attach(type: K) {
        const fnName = ("on" + type) as `on${K}`;
        const callback = target[fnName];
        const listener = handlers[fnName] as EventListener;
        typeof callback === "function"
            ? EventTargetP.prototype.addEventListener.call(target, type, listener)
            : EventTargetP.prototype.removeEventListener.call(target, type, listener);
    }
}

export function executeFn(target: EventTarget, cb: Function | null, ev: Event) {
    if (typeof cb === "function") cb.call(target, ev);
}

export function isEventTarget(value: unknown): value is EventTarget {
    return isPolyfillType<EventTarget>("EventTarget", value) || isExternalEventTarget(value);
}

function isExternalEventTarget(value: unknown): value is EventTarget {
    return !!value
        && typeof value === "object"
        && "addEventListener" in value
        && typeof value.addEventListener === "function"
        && "removeEventListener" in value
        && typeof value.removeEventListener === "function";
}

const EventTargetE = (typeof EventTarget !== "undefined" && EventTarget) || EventTargetP;
export { EventTargetE as EventTarget };
