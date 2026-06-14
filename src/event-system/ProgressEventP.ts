import { _Symbol, setState } from "../utils";
import { EventP, Event_setTrusted } from "./EventP";
import { EventTarget_dispatchEvent } from "./EventTargetP";

const fields = ["loaded", "total"] as const;

export class ProgressEventP extends EventP implements ProgressEvent {
    constructor(type: string, eventInitDict?: ProgressEventInit) {
        super(type, eventInitDict);
        setState(this, "__ProgressEvent__", new ProgressEventState());
        const s = state(this);

        s.lengthComputable = !!eventInitDict?.lengthComputable;
        s.loaded = Number(eventInitDict?.loaded ?? 0);
        s.total = Number(eventInitDict?.total ?? 0);

        for (let i = 0; i < fields.length; ++i) {
            let field = fields[i]!;
            if (isNaN(this[field])) {
                throw new TypeError(`Failed to construct 'ProgressEvent': Failed to read the '${field}' property from 'ProgressEventInit': The provided double value is non-finite.`);
            }
        }
    }

    /** @internal */ declare readonly __ProgressEvent__: ProgressEventState;

    get lengthComputable(): boolean { return state(this).lengthComputable; }
    get loaded(): number { return state(this).loaded; }
    get total(): number { return state(this).total; }

    /** @internal */ toString() { return "[object ProgressEvent]"; }
    /** @internal */ get [_Symbol.toStringTag]() { return "ProgressEvent"; }
    /** @internal */ get __MPHTTPX__() { return { chain: ["ProgressEvent", "Event"] }; }
}

/** @internal */
class ProgressEventState {
    lengthComputable = false;
    loaded = 0;
    total = 0;
}

function state(target: ProgressEventP) {
    return target.__ProgressEvent__;
}

export function emitProgressEvent(target: EventTarget, type: string, loaded = 0, total = 0) {
    let event = new ProgressEventP(type, {
        lengthComputable: total > 0,
        loaded,
        total,
    });

    event.__Event__.target = target;
    Event_setTrusted(event, true);
    EventTarget_dispatchEvent(target, event);
}
