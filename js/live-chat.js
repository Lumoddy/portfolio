import { FirebaseError } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { assertNonNull } from "./common.js";
import { LiveChatService } from "./live-chat/service.js";

/**
*/ export class LiveChatApp extends HTMLElement
{
    /**
    @type {(event: HTMLElementEventMap["input"]) => Promise<void>}
    */ #inputEvent = async ({ target }) =>
    {
        if (this.matchesNameInput(target) || this.matchesMessageInput(target))
        {
            this.getSendButton().disabled =
                !/^[^\x00-\x1F\r\n\t]{1,32}$/.test(this.getNameInput().value) ||
                !/^[^\x00-\x1F]{1,1024}$/.test(this.getMessageInput().textContent);
        }
    };

    /**
    @type {(event: HTMLElementEventMap["click"]) => Promise<void>}
    */ #clickEvent = async ({ target }) =>
    {
        if (this.matchesSendButton(target))
        {
            const input = this.getMessageInput();
            const oldDisabled = target.disabled;

            try
            {
                target.disabled = true;
                await this.#state.sendMessage(this.getNameInput().value, input.value);
                input.value = "";
            }
            catch (error)
            {
                target.disabled = oldDisabled;
                throw error;
            }
        }
    };

    /**
    @type {(event: HTMLElementEventMap["submit"]) => Promise<void>}
    */ #submitEvent = async ({ target }) =>
    {
        if (this.matchesMessageInput(target))
        {
            const oldDisabled = target.disabled;

            try
            {
                target.disabled = true;
                await this.#state.sendMessage(this.getNameInput().value, target.value);
                target.value = "";
            }
            catch (error)
            {
                target.disabled = oldDisabled;
                throw error;
            }
        }
    };

    /**
    @type {LiveChatService}
    */ #state = new LiveChatService();

    /**
    @public*/ constructor()
    {
        super();

        this.innerHTML = /*html*/`
          <div class="top"><input class="name-input" placeholder="Your Nickname"></div>
          <div class="message-container"></div>
          <div class="message-bar">
            <input class="message-input">
            <button class="send" disabled>Send</button>
            <div class="error"></div>
          </div>
        `;

        this.addEventListener("click", this.#clickEvent);
        this.addEventListener("input", this.#inputEvent);
        this.addEventListener("submit", this.#submitEvent);

        this.#state.addEventListener("message-added", ({ index, name, text }) =>
        {
            this.createMessage(index, name, text).scrollIntoView({ behavior: "smooth" });
        });

        this.#state.addEventListener("message-modify", ({ index, name, text }) =>
        {
            const element = this.queryMessage(index);
            if (element === null)
                this.createMessage(index, name, text);
            else
            {
                this.getNameInMessage(element).textContent = name;
                this.getTextInMessage(element).textContent = text;
            }
        });

        this.#state.addEventListener("message-remove", ({ index }) =>
        {
            this.queryMessage(index)?.remove();
        });
    }

    /**
    @returns {HTMLButtonElement?}
    */ querySendButton()
    {
        if (!(this instanceof LiveChatApp))
            throw new TypeError(
                `Invalid 'this', found '${typeof this}'.`);

        const element = this.querySelector("& button.send");
        return element instanceof HTMLButtonElement ? element : null;
    }

    /**
    @param {unknown} element
    @returns {element is HTMLButtonElement}
    */ matchesSendButton(element)
    {
        if (!(this instanceof LiveChatApp))
            throw new TypeError(
                `Invalid 'this', found '${typeof this}'.`);

        return element instanceof HTMLButtonElement &&
            this.contains(element) &&
            element.matches("button.send");
    }

    /**
    @returns {HTMLButtonElement}
    */ getSendButton()
    {
        return assertNonNull(LiveChatApp.prototype.querySendButton.call(this));
    }

    /**
    @returns {HTMLInputElement?}
    */ queryMessageInput()
    {
        if (!(this instanceof LiveChatApp))
            throw new TypeError(
                `Invalid 'this', found '${typeof this}'.`);

        const element = this.querySelector("& input.message-input");
        return element instanceof HTMLInputElement ? element : null;
    }

    /**
    @param {unknown} element
    @returns {element is HTMLInputElement}
    */ matchesMessageInput(element)
    {
        if (!(this instanceof LiveChatApp))
            throw new TypeError(
                `Invalid 'this', found '${typeof this}'.`);

        return element instanceof HTMLInputElement &&
            this.contains(element) &&
            element.matches("input.message-input");
    }

    /**
    @returns {HTMLInputElement}
    */ getMessageInput()
    {
        return assertNonNull(LiveChatApp.prototype.queryMessageInput.call(this));
    }

    /**
    @returns {HTMLInputElement?}
    */ queryNameInput()
    {
        if (!(this instanceof LiveChatApp))
            throw new TypeError(
                `Invalid 'this', found '${typeof this}'.`);

        const element = this.querySelector("& input.name-input");
        return element instanceof HTMLInputElement ? element : null;
    }

    /**
    @param {unknown} element
    @returns {element is HTMLInputElement}
    */ matchesNameInput(element)
    {
        if (!(this instanceof LiveChatApp))
            throw new TypeError(
                `Invalid 'this', found '${typeof this}'.`);

        return element instanceof HTMLInputElement &&
            this.contains(element) &&
            element.matches("input.name-input");
    }

    /**
    @returns {Element?}
    */ queryErrorMessage()
    {
        if (!(this instanceof LiveChatApp))
            throw new TypeError(
                `Invalid 'this', found '${typeof this}'.`);

        const element = this.queryErrorMessage()?.querySelector("& .error");
        return element instanceof Element ? element : null;
    }

    /**
    @param {unknown} element
    @returns {element is Element}
    */ matchesErrorMessage(element)
    {
        if (!(this instanceof LiveChatApp))
            throw new TypeError(
                `Invalid 'this', found '${typeof this}'.`);

        const container = this.queryErrorMessage();
        if (container === null)
            return false;

        return element instanceof Element &&
            container.contains(element) &&
            element.matches(".error");
    }

    /**
    @returns {Element}
    */ getErrorMessage()
    {
        return assertNonNull(LiveChatApp.prototype.queryMessageContainer.call(this));
    }

    /**
    @returns {HTMLInputElement}
    */ getNameInput()
    {
        return assertNonNull(LiveChatApp.prototype.queryNameInput.call(this));
    }

    /**
    @returns {Element?}
    */ queryMessageContainer()
    {
        if (!(this instanceof LiveChatApp))
            throw new TypeError(
                `Invalid 'this', found '${typeof this}'.`);

        const element = this.querySelector("& .message-container");
        return element instanceof Element ? element : null;
    }

    /**
    @param {unknown} element
    @returns {element is Element}
    */ matchesMessageContainer(element)
    {
        if (!(this instanceof LiveChatApp))
            throw new TypeError(
                `Invalid 'this', found '${typeof this}'.`);

        const container = this.queryMessageContainer();
        if (container === null)
            return false;

        return element instanceof Element &&
            container.contains(element) &&
            element.matches(".message-container");
    }

    /**
    @returns {Element}
    */ getMessageContainer()
    {
        return assertNonNull(LiveChatApp.prototype.queryMessageContainer.call(this));
    }

    /**
    @param {number} id
    @returns {Element?}
    */ queryMessage(id)
    {
        if (!(this instanceof LiveChatApp))
            throw new TypeError(
                `Invalid 'this', found '${typeof this}'.`);

        if (typeof id !== "number")
            throw new TypeError(
                `Argument 1 'id' must be a number, found '${typeof id}'.`);

        const element = this.querySelector(`& > live-message[data-message-id="${id}"]`);
        return element instanceof Element ? element : null;
    }

    /**
    @param {number | false} id
    @param {unknown} element
    @returns {element is Element}
    */ matchesMessage(id, element)
    {
        if (!(this instanceof LiveChatApp))
            throw new TypeError(
                `Invalid 'this', found '${typeof this}'.`);

        return element instanceof Element &&
            this === element.parentNode &&
            element.matches(
                id === false
                    ? `live-message[data-message-id]`
                    : `live-message[data-message-id="${id}"]`);
    }

    /**
    @param {number} id
    @returns {Element}
    */ getMessage(id)
    {
        return assertNonNull(LiveChatApp.prototype.queryMessage.call(this, id));
    }

    /**
    @param {Element} message
    @returns {Element?}
    */ queryNameInMessage(message)
    {
        if (LiveChatApp.prototype.matchesMessage.call(this, false, message))
            throw new TypeError(
                `Argument 1 'message' must be the return value of 'LiveChatApp` +
                `.getMessage', found '${typeof message}'.`);

        const element = this.querySelector(`& > .name`);
        return element instanceof Element ? element : null;
    }

    /**
    @param {Element} message
    @param {unknown} element
    @returns {element is Element}
    */ matchesNameInMessage(message, element)
    {
        if (LiveChatApp.prototype.matchesMessage.call(this, false, message))
            throw new TypeError(
                `Argument 1 'message' must be the return value of 'LiveChatApp` +
                `.getMessage', found '${typeof message}'.`);

        return element instanceof Element &&
            this === element.parentNode &&
            element.matches(".name");
    }

    /**
    @param {Element} message
    @returns {Element}
    */ getNameInMessage(message)
    {
        return assertNonNull(LiveChatApp.prototype.queryNameInMessage.call(this, message));
    }

    /**
    @param {Element} message
    @returns {Element?}
    */ queryTextInMessage(message)
    {
        if (LiveChatApp.prototype.matchesMessage.call(this, false, message))
            throw new TypeError(
                `Argument 1 'message' must be the return value of 'LiveChatApp` +
                `.getMessage', found '${typeof message}'.`);

        const element = this.querySelector(`& > .text`);
        return element instanceof Element ? element : null;
    }

    /**
    @param {Element} message
    @param {unknown} element
    @returns {element is Element}
    */ matchesTextInMessage(message, element)
    {
        if (LiveChatApp.prototype.matchesMessage.call(this, false, message))
            throw new TypeError(
                `Argument 1 'message' must be the return value of 'LiveChatApp` +
                `.getMessage', found '${typeof message}'.`);

        return element instanceof Element &&
            this === element.parentNode &&
            element.matches(".text");
    }

    /**
    @param {Element} message
    @returns {Element}
    */ getTextInMessage(message)
    {
        return assertNonNull(LiveChatApp.prototype.queryTextInMessage.call(this, message));
    }

    /**
    @param {number} id
    @param {string} name
    @param {string} message
    @returns {Element}
    */ createMessage(id, name, message)
    {
        const container = LiveChatApp.prototype.getMessageContainer.call(this);

        /**
        @type {Element | null}
        */ let previousSibling = null;
        let beforeId = -1;

        for (const element of container.querySelectorAll("live-message[data-message-id]"))
        {
            const elementId = Number(element.getAttribute("data-message-id"));
            if (elementId > beforeId && elementId < id)
                previousSibling = element;
        }

        const element = document.createElement("live-message");
        element.setAttribute("data-message-id", String(id));

        element.animate(
            [{ "--fade-in": 0.0 }, { "--fade-in": 1.0 }],
            { duration: 500, iterations: 1 })

        const nameElement = element.appendChild(document.createElement("span"));
        nameElement.classList.add("name");
        nameElement.append(name);

        const textElement = element.appendChild(document.createElement("span"));
        textElement.classList.add("text");
        textElement.append(message);

        if (previousSibling === null)
            container.append(element);
        else
            previousSibling.after(element);

        return element;
    }
}
customElements.define("app-live-chat", LiveChatApp);