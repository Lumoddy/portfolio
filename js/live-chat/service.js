import { FirebaseError, initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { collection, doc, FirestoreError, getDoc, deleteDoc, initializeFirestore, onSnapshot, query, setDoc } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { assertInstance } from "../common.js";

/**
@import { Unsubscribe } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js"
*/

/**
@export @typedef {
{
    "cancel": [event: { target: LiveChatService }],
    "message-added": [event: { target: LiveChatService, index: number, name: string, text: string }],
    "message-modify": [event: { target: LiveChatService, index: number, name: string, text: string }],
    "message-remove": [event: { target: LiveChatService, index: number }],
}
} LiveChatServiceEventMap
*/

// Firebase is set up with security settings so having this public is fine.
const firebaseApp = initializeApp(
{
    apiKey: "AIzaSyD8u_fCXbvQvX7bkH9lDyYSjarRJIMG6jk",
    authDomain: "portfolio-side-apps.firebaseapp.com",
    projectId: "portfolio-side-apps",
    storageBucket: "portfolio-side-apps.firebasestorage.app",
    messagingSenderId: "882222293744",
    appId: "1:882222293744:web:bb4ee5b27a2624262ed835",
});

const firebaseFirestore = initializeFirestore(firebaseApp, {});

/**
*/ export class LiveChatService
{
    /**
    @type {
    {
        [K in keyof LiveChatServiceEventMap]?:
        {
            once: boolean;
            listener: ((this: LiveChatService, ...args: LiveChatServiceEventMap[K]) => unknown),
        }[]
    }
    }
    */ #listeners =
    {
        "cancel": [],
        "message-added": [],
        "message-modify": [],
        "message-remove": [],
    };

    /**
    @type {Unsubscribe?}
    */ #unsubscribe;
    /**
    @returns {boolean}
    @readonly*/ get active() { return this.#unsubscribe !== null }

    /**
    @param {{}} [options]
    */ constructor(options = {})
    {
        this.#unsubscribe = onSnapshot(query(collection(firebaseFirestore, "live_chat")),
        {
            next: (snapshot) =>
            {
                for (const change of snapshot.docChanges())
                {
                    if (/^(?:0|[1-9][0-9]*)$/.test(change.doc.id))
                    {
                        switch (change.type)
                        {
                            case "added":
                            {
                                this.dispatchEvent(
                                    "message-added",
                                    {
                                        target: this,
                                        index: Number(change.doc.id),
                                        name: assertInstance(
                                            change.doc.get("name"),
                                            "string"),
                                        text: assertInstance(
                                            change.doc.get("text"),
                                            "string"),
                                    });

                                break;
                            }
                            case "modified":
                            {
                                this.dispatchEvent(
                                    "message-modify",
                                    {
                                        target: this,
                                        index: Number(change.doc.id),
                                        name: assertInstance(
                                            change.doc.get("name"),
                                            "string"),
                                        text: assertInstance(
                                            change.doc.get("text"),
                                            "string"),
                                    });

                                break;
                            }
                            case "removed":
                            {
                                this.dispatchEvent(
                                    "message-remove",
                                    {
                                        target: this,
                                        index: Number(change.doc.id),
                                    });

                                break;
                            }
                        }
                    }
                }
            },
        });
    }

    /**
    */ cancel()
    {
        if (!(this instanceof LiveChatService))
            throw new TypeError(
                `Invalid 'this', found '${typeof this}'.`);

        if (this.#unsubscribe === null)
            return;

        this.#unsubscribe();
        this.#unsubscribe = null;
        this.dispatchEvent("cancel", { target: this });
    }

    /**
    @param {string} name
    @param {string} text
    @returns {Promise<void>}
    */ async sendMessage(name, text)
    {
        if (!(this instanceof LiveChatService))
            throw new TypeError(
                `Invalid 'this', found '${typeof this}'.`);

        if (this.#unsubscribe === null)
            throw new Error(
                `Cannot use inactive limiter.`);

        const docRef = doc(firebaseFirestore, "live_chat", "info");
        const info = await getDoc(docRef);
        let index = info.exists() ? assertInstance(info.get("index"), "int") : 0;

        try
        {
            await setDoc(docRef, { "index": index + 1 });
            index += 1;
        }
        catch (error)
        {
            if (!(typeof error === "object"
                && error !== null
                && "code" in error
                && error.code === "permission-denied"))
                throw error;
        }

        if (index >= 100)
            deleteDoc(doc(firebaseFirestore, "live_chat", String(index - 100)));

        await setDoc(doc(firebaseFirestore, "live_chat", String(index)), { name, text });
    }

    /**
    @template {keyof LiveChatServiceEventMap} const K
    @param {K} type
    @param {(this: LiveChatService, ...args: LiveChatServiceEventMap[K]) => void} listener
    @param {
    {
        once?: boolean;
        signal?: AbortSignal;
    }
    } [options]
    */ addEventListener(type, listener, options = {})
    {
        if (!(this instanceof LiveChatService))
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
    @template {keyof LiveChatServiceEventMap} const K
    @param {K} type
    @param {(this: LiveChatService, ...args: LiveChatServiceEventMap[K]) => void} listener
    */ removeEventListener(type, listener)
    {
        if (!(this instanceof LiveChatService))
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
    @template {keyof LiveChatServiceEventMap} const K
    @param {K} type
    @param {LiveChatServiceEventMap[K]} parameters
    */ dispatchEvent(type, ...parameters)
    {
        if (!(this instanceof LiveChatService))
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