import { assertInstance, assertNonNull } from "./common.js";
import { LeakyBucketLimiter } from "./rate-limiter/leaky-bucket.js";
import { SlidingWindowLimiter } from "./rate-limiter/sliding-window.js";
import { TimerLimiter } from "./rate-limiter/timer.js";
import { TokenBucketLimiter } from "./rate-limiter/token-bucket.js";

/**
*/ export class RateLimiterApp extends HTMLElement
{
    /**
    @readonly*/ static observedAttributes = /** @type {const} */(
    [
        "data-algorithm",
        "data-bucket-capacity",
    ]);

    /**
    @returns {"timer" | "token-bucket" | "leaky-bucket" | "sliding-window"}
    @public*/ get limiterMethod()
    {
        switch (this.getAttribute("data-algorithm"))
        {
            default:
            case "timer": return "timer";
            case "token-bucket": return "token-bucket";
            case "leaky-bucket": return "leaky-bucket";
            case "sliding-window": return "sliding-window";
        }
    }
    /**
    @public*/ set limiterMethod(value)
    {
        switch (value)
        {
            default:
                throw new TypeError(
                    `Setter value must be a valid limiter algorithm, found ${typeof value}.`);
            case "timer":
            case "token-bucket":
            case "leaky-bucket":
            case "sliding-window":
        }

        this.setAttribute("data-algorithm", value);
    }

    /**
    @returns {number}
    @public*/ get limiterBucketCapacity()
    {
        return Number(this.getAttribute("data-bucket-capacity"));
    }
    /**
    @public*/ set limiterBucketCapacity(value)
    {
        if (typeof value !== "number")
            throw new TypeError(
                `Setter value must be a number, found ${typeof value}.`);

        this.setAttribute("data-bucket-capacity", String(value));
    }

    /**
    @type {(event: HTMLElementEventMap["click"]) => void}
    */ #clickEvent = (e) =>
    {
        if (this.matchesClientButton(e.target))
        {
            switch (true)
            {
                case this.#state instanceof TimerLimiter && this.#state.canPop():
                    this.#state.pop();
                    this.blinkServer();
                    break;
                case this.#state instanceof TokenBucketLimiter && this.#state.canPop():
                    this.#state.pop();
                    this.blinkServer();
                    break;
                case this.#state instanceof LeakyBucketLimiter && this.#state.canPush():
                    this.#state.push();
                    this.blinkServer();
                    break;
                case this.#state instanceof SlidingWindowLimiter && this.#state.canPush():
                    this.#state.push();
                    this.blinkServer();
                    break;
            }
        }
    };

    /**
    @type {(event: HTMLElementEventMap["change"]) => void}
    */ #changeEvent = (e) =>
    {
        if (this.matchesMethodSelector(e.target))
        {
            this.#state.cancel();

            switch (e.target.value)
            {
                case "timer":
                    this.#state = this.#newTimerLimiter();
                    break;
                case "token-bucket":
                    this.#state = this.#newTokenBucketLimiter();
                    break;
                case "leaky-bucket":
                    this.#state = this.#newLeakyBucketLimiter();
                    break;
                case "sliding-window":
                    this.#state = this.#newSlidingWindowLimiter();
                    break;
            }
        }
    };

    /**
    @type {TimerLimiter | TokenBucketLimiter | LeakyBucketLimiter | SlidingWindowLimiter}
    */ #state = this.#newTimerLimiter();

    /**
    @public*/ constructor()
    {
        super();

        this.innerHTML = /*html*/`
          <button class="client"><img src="./i/click-indicator.svg"></button>
          <div class="server"></div>
          <div class="bar"></div>
          <label class="algorithm-label">
            Algorithm:
            <select class="algorithm">
              <option value="timer">Timer</option>
              <option value="token-bucket">Token Bucket</option>
              <option value="leaky-bucket">Leaky Bucket</option>
              <option value="sliding-window">Sliding Window</option>
            </select>
          </label>
        `;

        this.addEventListener("click", this.#clickEvent);
        this.addEventListener("change", this.#changeEvent);
    }

    /**
    @param {typeof RateLimiterApp["observedAttributes"][number]} attributeName
    @param {string?} oldValue
    @param {string?} newValue
    */ attributeChangedCallback(attributeName, oldValue, newValue)
    {
        switch (attributeName)
        {
            case "data-algorithm":
                this.getMethodSelector().value = newValue ?? "timer";
                break;
        }
    }

    /**
    @returns {TimerLimiter}
    */ #newTimerLimiter()
    {
        /**
        @type {Animation | null}
        */ let animation = null;

        const limiter = new TimerLimiter({ duration: 500 });

        limiter.addEventListener("push-start", ({ duration }) =>
        {
            if (animation !== null)
                animation.cancel();

            animation = this.getBar().animate(
                [{ "--wait-out": 1.0 }, { "--wait-out": 0.0 }],
                { duration, iterations: 1 });
        });

        limiter.addEventListener("cancel", () =>
        {
            if (animation !== null)
                animation.cancel();
        });

        return limiter;
    }

    /**
    @returns {TokenBucketLimiter}
    */ #newTokenBucketLimiter()
    {
        /**
        @type {HTMLElement[]}
        */ const elements = [];

        const limiter = new TokenBucketLimiter(
        {
            duration: 500,
            capacity: this.limiterBucketCapacity,
        });

        limiter.addEventListener("push-start", ({ duration }) =>
        {
            const element = document.createElement("filling-token");
            this.getBar().append(element);

            element.animate(
                [{ "--wait-in": 0.0 }, { "--wait-in": 1.0 }],
                { duration, iterations: 1 });

            elements.push(element);
        });

        limiter.addEventListener("pop", () =>
        {
            const element = assertNonNull(elements.shift());

            element.animate(
                [{ "--fade-out": 0.0 }, { "--fade-out": 1.0 }],
                { duration: 200, iterations: 1 })
                .finished
                .then(() => element.remove());
        });

        limiter.addEventListener("cancel", () =>
        {
            [...this.getBar().childNodes].forEach((x) => x.remove());
        });

        return limiter;
    }

    /**
    @returns {LeakyBucketLimiter}
    */ #newLeakyBucketLimiter()
    {
        /**
        @type {HTMLElement[]}
        */ const elements = [];

        const limiter = new LeakyBucketLimiter(
        {
            duration: 500,
            capacity: this.limiterBucketCapacity,
        });

        limiter.addEventListener("push", () =>
        {
            const element = document.createElement("leaking-token");
            this.getBar().prepend(element);

            element.animate(
                [{ "--fade-in": 0.0 }, { "--fade-in": 1.0 }],
                { duration: 200, iterations: 1 });

            elements.push(element);
        });

        limiter.addEventListener("pop-start", ({ duration }) =>
        {
            const element = assertNonNull(elements.shift());

            element.animate(
                [{ "--wait-out": 0.0 }, { "--wait-out": 1.0 }],
                { duration, iterations: 1 })
                .finished
                .then(() => element.remove());
        });

        limiter.addEventListener("cancel", () =>
        {
            [...this.getBar().childNodes].forEach((x) => x.remove());
        });

        return limiter;
    }

    /**
    @returns {SlidingWindowLimiter}
    */ #newSlidingWindowLimiter()
    {
        /**
        @type {Set<HTMLElement>}
        */ const elements = new Set();

        const limiter = new SlidingWindowLimiter(
        {
            duration: 3000,
            capacity: this.limiterBucketCapacity,
        });

        limiter.addEventListener("push", ({ duration }) =>
        {
            const element = this.getBar().appendChild(
                document.createElement("sliding-token"));

            element.animate(
                [{ "--wait-out": 0.0 }, { "--wait-out": 1.0 }],
                { duration, iterations: 1 })
                .finished
                .then(() =>
                {
                    element.remove();
                    elements.delete(element);
                });

            elements.add(element);
        });

        limiter.addEventListener("cancel", () =>
        {
            for (const element of elements)
                element.remove();
        });

        return limiter;
    }

    /**
    */ blinkServer()
    {
        assertNonNull(RateLimiterApp.prototype.queryServerBlinker.call(this))
            .animate(
                [{ "--blink": 1.0 }, { "--blink": 0.0 }],
                { duration: 200, iterations: 1 });
    }

    /**
    @returns {HTMLButtonElement?}
    */ queryClientButton()
    {
        if (!(this instanceof RateLimiterApp))
            throw new TypeError(
                `Invalid 'this', found ${typeof this}.`);

        const element = this.querySelector("& button.client");
        return element instanceof HTMLButtonElement ? element : null;
    }

    /**
    @param {unknown} element
    @returns {element is HTMLButtonElement}
    */ matchesClientButton(element)
    {
        if (!(this instanceof RateLimiterApp))
            throw new TypeError(
                `Invalid 'this', found ${typeof this}.`);

        return element instanceof HTMLButtonElement &&
            this.contains(element) &&
            element.matches("button.client");
    }

    /**
    @returns {HTMLButtonElement}
    */ getClientButton() { return assertNonNull(this.queryClientButton()) }

    /**
    @returns {Element?}
    */ queryServerBlinker()
    {
        if (!(this instanceof RateLimiterApp))
            throw new TypeError(
                `Invalid 'this', found ${typeof this}.`);

        return this.querySelector("& .server");
    }

    /**
    @param {unknown} element
    @returns {element is Element}
    */ matchesServerBlinker(element)
    {
        if (!(this instanceof RateLimiterApp))
            throw new TypeError(
                `Invalid 'this', found ${typeof this}.`);

        return element instanceof HTMLButtonElement &&
            this.contains(element) &&
            element.matches(".server");
    }

    /**
    @returns {Element}
    */ getServerBlinker() { return assertNonNull(this.queryServerBlinker()) }

    /**
    @returns {Element?}
    */ queryBar()
    {
        if (!(this instanceof RateLimiterApp))
            throw new TypeError(
                `Invalid 'this', found ${typeof this}.`);

        return this.querySelector("& .bar");
    }

    /**
    @param {unknown} element
    @returns {element is Element}
    */ matchesBar(element)
    {
        if (!(this instanceof RateLimiterApp))
            throw new TypeError(
                `Invalid 'this', found ${typeof this}.`);

        return element instanceof Element &&
            this.contains(element) &&
            element.matches(".bar");
    }

    /**
    @returns {Element}
    */ getBar() { return assertNonNull(this.queryBar()) }

    /**
    @returns {HTMLSelectElement?}
    */ queryMethodSelector()
    {
        if (!(this instanceof RateLimiterApp))
            throw new TypeError(
                `Invalid 'this', found ${typeof this}.`);

        const element = this.querySelector("& select.algorithm");
        return element instanceof HTMLSelectElement ? element : null;
    }

    /**
    @param {unknown} element
    @returns {element is HTMLSelectElement}
    */ matchesMethodSelector(element)
    {
        if (!(this instanceof RateLimiterApp))
            throw new TypeError(
                `Invalid 'this', found ${typeof this}.`);

        return element instanceof HTMLSelectElement &&
            this.contains(element) &&
            element.matches("select.algorithm");
    }

    /**
    @returns {HTMLSelectElement}
    */ getMethodSelector() { return assertNonNull(this.queryMethodSelector()) }
}
customElements.define("app-rate-limiter", RateLimiterApp);