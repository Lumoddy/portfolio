
/**
@export @typedef {
{
    "cancel": [event: { target: TokenBucketLimiter }],
    "push-start": [event: { target: TokenBucketLimiter, duration: number }],
    "push-end": [event: { target: TokenBucketLimiter }],
    "pop": [event: { target: TokenBucketLimiter }],
}
} TokenBucketLimiterEventMap
*/

/**
*/ export class TokenBucketLimiter
{
    /**
    @type {
    {
        [K in keyof TokenBucketLimiterEventMap]?:
        {
            once: boolean;
            listener: ((this: TokenBucketLimiter, ...args: TokenBucketLimiterEventMap[K]) => unknown),
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
    @type {number}
    */ #length = -1;
    /**
    @returns {number}
    @readonly*/ get length()
    {
        return this.#length;
    }

    /**
    @type {number}
    */ #capacity = -1;
    /**
    @returns {number}
    @readonly*/ get capacity() { return this.#capacity }

    /**
    @type {ReturnType<setTimeout> | -1}
    */ #timeout = -1;

    /**
    @returns {number}
    @readonly*/ get pendingLength()
    {
        return this.#length + (this.#timeout === -1 ? 0 : 1);
    }

    /**
    @param {{ duration: number, capacity: number, length?: number }} options
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

        this.#length = options.length ?? 0;
        if (!Number.isInteger(this.#length) || this.#length < 0)
            throw new TypeError(
                `Argument 1 'options' field 'length' must be a positive integer, found '${typeof this.#length}'.`);

        if (this.#length < this.#capacity)
        {
            setTimeout(() =>
            {
                this.dispatchEvent("push-start", { target: this, duration: this.#duration })
                this.#timeout = setTimeout(() => this.push(), this.#duration);
            });
        }
    }

    /**
    */ cancel()
    {
        if (!(this instanceof TokenBucketLimiter))
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
        if (!(this instanceof TokenBucketLimiter))
            throw new TypeError(
                `Invalid 'this', found '${typeof this}'.`);

        return this.#active && this.#length < this.#capacity;
    }

    /**
    */ push()
    {
        if (!(this instanceof TokenBucketLimiter))
            throw new TypeError(
                `Invalid 'this', found '${typeof this}'.`);

        if (!this.#active)
            throw new Error(
                `Cannot use inactive limiter.`);

        if (this.#length >= this.#capacity)
            throw new Error(
                `Cannot push to full limiter.`);

        if (this.#timeout === -1)
        {
            this.dispatchEvent("push-start", { target: this, duration: 0 });
        }
        else
        {
            clearTimeout(this.#timeout);
            this.#timeout = -1;
        }

        this.dispatchEvent("push-end", { target: this });
        this.#length += 1;

        if (this.#length < this.#capacity)
        {
            this.dispatchEvent("push-start", { target: this, duration: this.#duration });
            this.#timeout = setTimeout(() => this.push(), this.#duration);
        }
    }

    /**
    @returns {boolean}
    */ canPop()
    {
        if (!(this instanceof TokenBucketLimiter))
            throw new TypeError(
                `Invalid 'this', found '${typeof this}'.`);

        return this.#active && this.#length > 0;
    }

    /**
    @returns {true | undefined}
    */ pop()
    {
        if (!(this instanceof TokenBucketLimiter))
            throw new TypeError(
                `Invalid 'this', found '${typeof this}'.`);

        if (!this.#active)
            throw new Error(
                `Cannot use inactive limiter.`);

        if (this.#length === 0)
            return;

        this.dispatchEvent("pop", { target: this });
        this.#length -= 1;

        if (this.#timeout === -1 && this.#length < this.#capacity)
        {
            this.dispatchEvent("push-start", { target: this, duration: this.#duration });
            this.#timeout = setTimeout(() => this.push(), this.#duration);
        }

        return true;
    }

    /**
    @template {keyof TokenBucketLimiterEventMap} const K
    @param {K} type
    @param {(this: TokenBucketLimiter, ...args: TokenBucketLimiterEventMap[K]) => void} listener
    @param {
    {
        once?: boolean;
        signal?: AbortSignal;
    }
    } [options]
    */ addEventListener(type, listener, options = {})
    {
        if (!(this instanceof TokenBucketLimiter))
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
    @template {keyof TokenBucketLimiterEventMap} const K
    @param {K} type
    @param {(this: TokenBucketLimiter, ...args: TokenBucketLimiterEventMap[K]) => void} listener
    */ removeEventListener(type, listener)
    {
        if (!(this instanceof TokenBucketLimiter))
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
    @template {keyof TokenBucketLimiterEventMap} const K
    @param {K} type
    @param {TokenBucketLimiterEventMap[K]} parameters
    */ dispatchEvent(type, ...parameters)
    {
        if (!(this instanceof TokenBucketLimiter))
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