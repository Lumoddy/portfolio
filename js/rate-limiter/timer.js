
/**
@export @typedef {
{
    "cancel": [event: { target: TimerLimiter }],
    "push-start": [event: { target: TimerLimiter, duration: number }],
    "push-end": [event: { target: TimerLimiter }],
    "pop": [event: { target: TimerLimiter }],
}
} TimerLimiterEventMap
*/

/**
*/ export class TimerLimiter
{
    /**
    @type {
    {
        [K in keyof TimerLimiterEventMap]?:
        {
            once: boolean;
            listener: ((this: TimerLimiter, ...args: TimerLimiterEventMap[K]) => unknown),
        }[]
    }
    }
    */ #listeners =
    {
        "cancel": [],
        "push-start": [],
        "push-end": [],
        "pop": [],
    };

    /**
    @type {boolean}
    */ #active = true;
    /**
    @returns {boolean}
    @readonly*/ get active() { return this.#active }

    /**
    @type {number}
    */ #duration;
    /**
    @returns {number}
    */ get duration() { return this.#duration }
    /**
    */ set duration(value)
    {
        if (typeof value !== "number")
            throw new TypeError(
                `Setter value must be a number, found '${typeof value}'.`);

        this.#duration = value;
    }

    /**
    @type {ReturnType<setTimeout> | -1}
    */ #timeout = -1;

    /**
    @returns {0 | 1}
    @readonly*/ get pendingLength() { return this.#timeout === -1 ? 0 : 1 }

    /**
    @param {{ duration: number, length?: 0 | 1 }} options
    */ constructor(options)
    {
        this.#duration = options.duration;
        if (typeof this.#duration !== "number")
            throw new TypeError(
                `Argument 1 'options' field 'duration' must be a number, found '${typeof this.#duration}'.`);

        const length = options.length ?? 1;
        switch (length)
        {
            case 0:
                this.push();
                break;
            case 1:
                break;
            default:
                throw new TypeError(
                    `Argument 1 'options' field 'length' must be 0 or 1, found '${typeof length}'.`);
        }
    }

    /**
    */ cancel()
    {
        if (!(this instanceof TimerLimiter))
            throw new TypeError(
                `Invalid 'this', found '${typeof this}'.`);

        if (!this.#active)
            return;

        clearTimeout(this.#timeout);
        this.#active = false;
        this.dispatchEvent("cancel", { target: this });
    }

    /**
    @returns {boolean}
    */ canPush()
    {
        if (!(this instanceof TimerLimiter))
            throw new TypeError(
                `Invalid 'this', found '${typeof this}'.`);

        return this.#active && this.#timeout !== -1;
    }

    /**
    */ push()
    {
        if (!(this instanceof TimerLimiter))
            throw new TypeError(
                `Invalid 'this', found '${typeof this}'.`);

        if (!this.#active)
            throw new Error(
                `Cannot use inactive limiter.`);

        if (this.#timeout === -1)
            throw new Error(
                `Cannot push to full limiter.`);

        clearTimeout(this.#timeout);
        this.#timeout = -1;

        this.dispatchEvent("push-end", { target: this });
    }

    /**
    @returns {boolean}
    */ canPop()
    {
        if (!(this instanceof TimerLimiter))
            throw new TypeError(
                `Invalid 'this', found '${typeof this}'.`);

        return this.#active && this.#timeout === -1;
    }

    /**
    @returns {true | undefined}
    */ pop()
    {
        if (!(this instanceof TimerLimiter))
            throw new TypeError(
                `Invalid 'this', found '${typeof this}'.`);

        if (!this.#active)
            throw new Error(
                `Cannot use inactive limiter.`);

        if (this.#timeout !== -1)
            return;

        this.dispatchEvent("pop", { target: this });
        this.dispatchEvent("push-start", { target: this, duration: this.#duration });
        this.#timeout = setTimeout(() => this.push(), this.#duration);

        return true;
    }

    /**
    @template {keyof TimerLimiterEventMap} const K
    @param {K} type
    @param {(this: TimerLimiter, ...args: TimerLimiterEventMap[K]) => void} listener
    @param {
    {
        once?: boolean;
        signal?: AbortSignal;
    }
    } [options]
    */ addEventListener(type, listener, options = {})
    {
        if (!(this instanceof TimerLimiter))
            throw new TypeError(
                `Invalid 'this', found '${typeof this}'.`);

        const signal = options.signal;
        if (signal !== undefined && !(signal instanceof AbortSignal))
            throw new TypeError(
                `Argument 1 'options' field 'signal' must be a number, found '${typeof signal}'.`);

        if (signal?.aborted === true)
            return;

        const once = options.once ?? false;
        if (typeof once !== "boolean")
            throw new TypeError(
                `Argument 1 'options' field 'once' must be a number, found '${typeof once}'.`);

        this.#listeners[type]?.push({ once, listener });
        signal?.addEventListener("abort", () => this.push());
    }

    /**
    @template {keyof TimerLimiterEventMap} const K
    @param {K} type
    @param {(this: TimerLimiter, ...args: TimerLimiterEventMap[K]) => void} listener
    */ removeEventListener(type, listener)
    {
        if (!(this instanceof TimerLimiter))
            throw new TypeError(
                `Invalid 'this', found '${typeof this}'.`);

        const listenerList = this.#listeners[type];
        if (listenerList === undefined)
            return;

        for (let i = 0; i < listenerList.length; i += 1)
        {
            if (listener === listenerList[i].listener)
            {
                listenerList.splice(i, 1);
                break;
            }
        }
    }

    /**
    @template {keyof TimerLimiterEventMap} const K
    @param {K} type
    @param {TimerLimiterEventMap[K]} parameters
    */ dispatchEvent(type, ...parameters)
    {
        if (!(this instanceof TimerLimiter))
            throw new TypeError(
                `Invalid 'this', found '${typeof this}'.`);

        const listenerList = this.#listeners[type];
        if (listenerList === undefined)
            return;

        for (let i = 0; i < listenerList.length; i += 1)
        {
            const entry = listenerList[i];
            if (entry.once)
            {
                listenerList.splice(i, 1);
                i -= 1;
            }

            setTimeout(() => entry.listener.call(this, ...parameters));
        }
    }
}