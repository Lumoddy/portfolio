
/**
@template T
@param {T} value
@returns {NonNullable<T>}
*/ export function assertNonNull(value)
{
    if (value == null)
        throw new TypeError(`Assertion failed: Value is null.`);

    return value;
}

/**
@template {
    | Function
    | "bigint"
    | "boolean"
    | "function"
    | "number"
    | "int"
    | "object"
    | "string"
    | "symbol"
    | "undefined"
} C
@template T
@overload
@param {T} value
@param {C} prototype
@returns {
    "bigint" extends C ? BigInt :
    "boolean" extends C ? boolean :
    "function" extends C ? Function :
    "number" extends C ? number :
    "int" extends C ? number :
    "object" extends C ? Object :
    "string" extends C ? string :
    "symbol" extends C ? Symbol :
    "undefined" extends C ? undefined :
    C["prototype"]
}
*//**
@param {unknown} value
@param {Function | string} prototype
@returns {unknown}
*/ export function assertInstance(value, prototype)
{
    if (typeof prototype === "string")
    {
        switch (prototype)
        {
            case "int":
                if (!Number.isInteger(value))
                    throw new TypeError(`Assertion failed: Value is not an integer.`);
                break;
            default:
                if (typeof value !== prototype)
                    throw new TypeError(`Assertion failed: Value is not type '${prototype}'.`);
                break;
        }
    }
    else
    {
        if (!(value instanceof prototype))
            throw new TypeError(`Assertion failed: Value is not instance of '${prototype.name}'.`);
    }

    return value;
}