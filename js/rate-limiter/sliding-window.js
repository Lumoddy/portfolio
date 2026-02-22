
/**
@export @typedef {
{
    "cancel": [event: { target: SlidingWindowLimiter }],
    "push": [event: { target: SlidingWindowLimiter, id: number, duration: number }],
    "pop": [event: { target: SlidingWindowLimiter, id: number }],
}
} SlidingWindowLimiterEventMap
*/

/**
*/ export class SlidingWindowLimiter
{
    /**
    @type {
    {
        [K in keyof SlidingWindowLimiterEventMap]?:
        {
            once: boolean;
            listener: ((this: SlidingWindowLimiter, ...args: SlidingWindowLimiterEventMap[K]) => unknown),
        }[]
    }
    }
    */ #listeners =
    {
        "cancel": [],
        "push": [],
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
    @type {number}
    */ #length = 0;
    /**
    @returns {number}
    @readonly*/ get length()
    {
        let counter = 0;
        for (const x of this.#timeouts)
            if (x !== undefined)
                counter += 1;

        return counter;
    }

    /**
    @type {number}
    */ #capacity = -1;
    /**
    @returns {number}
    @readonly*/ get capacity() { return this.#capacity }

    /**
    @type {(ReturnType<setTimeout> | undefined)[]}
    */ #timeouts = [];

    /**
    @param {{ duration: number, capacity: number }} options
    */ constructor(options)
    {
        this.#duration = options.duration;
        if (typeof this.#duration !== "number")
            throw new TypeError(
                `Argument 1 'options' field 'duration' must be a number, found '${typeof this.#duration}'.`);

        this.#capacity = options.capacity;
        if (!Number.isInteger(this.#capacity) || this.#capacity < 0)
            throw new TypeError(
                `Argument 1 'options' field 'capacity' must be a positive integer, found '${typeof this.#capacity}'.`);
    }

    /**
    */ cancel()
    {
        if (!(this instanceof SlidingWindowLimiter))
            throw new TypeError(
                `Invalid 'this', found '${typeof this}'.`);

        if (!this.#active)
            return;

        for (const timeout of this.#timeouts)
            clearTimeout(timeout);

        this.#timeouts.length = 0;
        this.#active = false;
        this.dispatchEvent("cancel", { target: this });
    }

    /**
    @returns {boolean}
    */ canPush()
    {
        if (!(this instanceof SlidingWindowLimiter))
            throw new TypeError(
                `Invalid 'this', found '${typeof this}'.`);

        return this.#active && this.#length < this.#capacity;
    }

    /**
    */ push()
    {
        if (!(this instanceof SlidingWindowLimiter))
            throw new TypeError(
                `Invalid 'this', found '${typeof this}'.`);

        if (!this.#active)
            throw new Error(
                `Cannot use inactive limiter.`);

        if (this.#length >= this.#capacity)
            throw new Error(
                `Cannot push to full limiter.`);

        for (let id = 0;; id += 1)
        {
            if (this.#timeouts[id] === undefined)
            {
                this.#length += 1;
                this.dispatchEvent("push", { target: this, id, duration: this.#duration });

                this.#timeouts[id] = setTimeout(
                    () =>
                    {
                        this.#length -= 1;
                        this.dispatchEvent("pop", { target: this, id });

                        this.#timeouts[id] = undefined;
                    },
                    this.#duration);

                return;
            }
        }
    }

    /**
    @template {keyof SlidingWindowLimiterEventMap} const K
    @param {K} type
    @param {(this: SlidingWindowLimiter, ...args: SlidingWindowLimiterEventMap[K]) => void} listener
    @param {
    {
        once?: boolean;
        signal?: AbortSignal;
    }
    } [options]
    */ addEventListener(type, listener, options = {})
    {
        if (!(this instanceof SlidingWindowLimiter))
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

        const listenerList = this.#listeners[type];
        if (listenerList !== undefined)
        {
            listenerList.push({ once, listener });
            signal?.addEventListener(
                "abort",
                () => this.removeEventListener(type, listener));
        }
    }

    /**
    @template {keyof SlidingWindowLimiterEventMap} const K
    @param {K} type
    @param {(this: SlidingWindowLimiter, ...args: SlidingWindowLimiterEventMap[K]) => void} listener
    */ removeEventListener(type, listener)
    {
        if (!(this instanceof SlidingWindowLimiter))
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
    @template {keyof SlidingWindowLimiterEventMap} const K
    @param {K} type
    @param {SlidingWindowLimiterEventMap[K]} parameters
    */ dispatchEvent(type, ...parameters)
    {
        if (!(this instanceof SlidingWindowLimiter))
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