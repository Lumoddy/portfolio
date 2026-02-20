import { assertInstance, assertNonNull } from "./common.js";

/**
*/ export class RateLimiterApp extends HTMLElement
{
    /**
    @readonly*/ static observedAttributes = /** @type {const} */(
    [
        "data-method",
        "data-bucket-capacity",
    ]);

    /**
    @type {(event: HTMLElementEventMap["click"]) => void}
    */ #clickEvent;

    /**
    @type {(event: HTMLElementEventMap["change"]) => void}
    */ #changeEvent;

    /**
    @public*/ constructor()
    {
        super();

        this.innerHTML = /*html*/`
          <button class="client"></button>
          <div class="server"></div>
          <div class="bar"></div>
          <div class="timer"></div>
          <label>
            <select class="method">
              <option value="timer">Timer</option>
              <option value="token-bucket">Token Bucket</option>
              <option value="leaky-bucket">Leaky Bucket</option>
              <option value="sliding-window">Sliding Window</option>
            </select>
          </label>
        `;

        this.#clickEvent = (e) =>
        {
            if (this.matchesClientButton(e.target))
            {
                switch (assertNonNull(this.queryMethodSelector()).value)
                {
                    case "timer":
                    {
                        const bar = assertNonNull(this.queryBar());
                        if (bar.getAnimations().length === 0)
                        {
                            bar.animate(
                                [{ "--time": 1.0 }, { "--time": 0.0 }],
                                { duration: 500, iterations: 1 });

                            this.blinkServer();
                        }

                        break;
                    }
                    case "token-bucket":
                    {
                        const bar = assertNonNull(this.queryBar());
                        const firstToken = bar.firstElementChild;
                        if (firstToken !== null &&
                            firstToken.getAnimations().length === 0)
                        {
                            firstToken.remove();
                            this.blinkServer();

                            const lastToken = bar.lastElementChild;
                            if (lastToken === null ||
                                lastToken.getAnimations().length === 0)
                            {
                                /**
                                @type {() => boolean}
                                */ const append = () =>
                                {
                                    const bar = assertNonNull(this.queryBar());

                                    if (!(bar.childElementCount <
                                        Number(this.getAttribute("data-bucket-capacity"))))
                                        return false;

                                    const newToken = bar.appendChild(
                                        document.createElement("filling-token"));

                                    newToken
                                        .animate(
                                            [{ "--time": 1.0 }, { "--time": 0.0 }],
                                            { duration: 500, iterations: 1 })
                                        .finished
                                        .then(append);

                                    return true;
                                }

                                append();
                            }
                        }

                        break;
                    }
                    case "leaky-bucket":
                    {
                        const bar = assertNonNull(this.queryBar());
                        const tokenCount = bar.childElementCount;
                        if (tokenCount < Number(this.getAttribute("data-bucket-capacity")))
                        {
                            const newToken = bar.appendChild(
                                document.createElement("leaking-token"));

                            this.blinkServer();

                            if (tokenCount === 0)
                            {
                                /**
                                @type {(token: Element) => () => void}
                                */ const bindToFinish = (token) => () =>
                                {
                                    const nextToken = token.nextSibling;
                                    
                                    token.remove();

                                    if (!(nextToken instanceof Element))
                                        return;

                                    nextToken
                                        .animate(
                                            [{ "--time": 1.0 }, { "--time": 0.0 }],
                                            { duration: 500, iterations: 1 })
                                        .finished
                                        .then(bindToFinish(nextToken));
                                };

                                newToken
                                    .animate(
                                        [{ "--time": 1.0 }, { "--time": 0.0 }],
                                        { duration: 500, iterations: 1 })
                                    .finished
                                    .then(bindToFinish(newToken));
                            }
                        }

                        break;
                    }
                    case "sliding-window":
                    {
                        const bar = assertNonNull(this.queryBar());
                        const tokenCount = bar.childElementCount;
                        if (tokenCount < Number(this.getAttribute("data-bucket-capacity")))
                        {
                            const newToken = bar.appendChild(
                                document.createElement("sliding-token"));

                            this.blinkServer();

                            newToken
                                .animate(
                                    [{ "--time": 1.0 }, { "--time": 0.0 }],
                                    { duration: 1000, iterations: 1 })
                                .finished
                                .then(() => newToken.remove());
                        }

                        break;
                    }
                }
            }
        }

        this.#changeEvent = (e) =>
        {
            if (this.matchesMethodSelector(e.target))
            {
                const bar = assertNonNull(this.queryBar());
                bar.getAnimations().forEach((a) => a.cancel());
                [...bar.children].forEach((x) =>
                {
                    x.getAnimations().forEach((a) => a.cancel());
                    x.remove();
                });

                switch (e.target.value)
                {
                    case "token-bucket":
                    {
                        /**
                        @type {() => boolean}
                        */ const append = () =>
                        {
                            const bar = assertNonNull(this.queryBar());

                            if (!(bar.childElementCount <
                                Number(this.getAttribute("data-bucket-capacity"))))
                                return false;

                            const newToken = bar.appendChild(
                                document.createElement("filling-token"));

                            newToken
                                .animate(
                                    [{ "--time": 1.0 }, { "--time": 0.0 }],
                                    { duration: 500, iterations: 1 })
                                .finished
                                .then(append);

                            return true;
                        }

                        append();

                        break;
                    }
                }
            }
        }

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
            case "data-method":
                assertNonNull(this.queryMethodSelector()).value = newValue ?? "timer";
                break;
        }
    }

    /**
    */ blinkServer()
    {
        document.body.append("*");
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
                `Invalid 'this', found ${typeof this}`);

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
                `Invalid 'this', found ${typeof this}`);

        return element instanceof HTMLButtonElement &&
            this.contains(element) &&
            element.matches("button.client");
    }

    /**
    @returns {Element?}
    */ queryServerBlinker()
    {
        if (!(this instanceof RateLimiterApp))
            throw new TypeError(
                `Invalid 'this', found ${typeof this}`);

        return this.querySelector("& .server");
    }

    /**
    @param {unknown} element
    @returns {element is Element}
    */ matchesServerBlinker(element)
    {
        if (!(this instanceof RateLimiterApp))
            throw new TypeError(
                `Invalid 'this', found ${typeof this}`);

        return element instanceof HTMLButtonElement &&
            this.contains(element) &&
            element.matches(".server");
    }

    /**
    @returns {Element?}
    */ queryBar()
    {
        if (!(this instanceof RateLimiterApp))
            throw new TypeError(
                `Invalid 'this', found ${typeof this}`);

        return this.querySelector("& .bar");
    }

    /**
    @param {unknown} element
    @returns {element is Element}
    */ matchesBar(element)
    {
        if (!(this instanceof RateLimiterApp))
            throw new TypeError(
                `Invalid 'this', found ${typeof this}`);

        return element instanceof Element &&
            this.contains(element) &&
            element.matches(".bar");
    }

    /**
    @returns {Element?}
    */ queryTimer()
    {
        if (!(this instanceof RateLimiterApp))
            throw new TypeError(
                `Invalid 'this', found ${typeof this}`);

        return this.querySelector("& .timer");
    }

    /**
    @param {unknown} element
    @returns {element is Element}
    */ matchesTimer(element)
    {
        if (!(this instanceof RateLimiterApp))
            throw new TypeError(
                `Invalid 'this', found ${typeof this}`);

        return element instanceof Element &&
            this.contains(element) &&
            element.matches(".timer");
    }

    /**
    @returns {HTMLSelectElement?}
    */ queryMethodSelector()
    {
        if (!(this instanceof RateLimiterApp))
            throw new TypeError(
                `Invalid 'this', found ${typeof this}`);

        const element = this.querySelector("& select.method");
        return element instanceof HTMLSelectElement ? element : null;
    }

    /**
    @param {unknown} element
    @returns {element is HTMLSelectElement}
    */ matchesMethodSelector(element)
    {
        if (!(this instanceof RateLimiterApp))
            throw new TypeError(
                `Invalid 'this', found ${typeof this}`);

        return element instanceof HTMLSelectElement &&
            this.contains(element) &&
            element.matches("select.method");
    }
}
customElements.define("app-rate-limiter", RateLimiterApp);