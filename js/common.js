
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
@template {Function} T
@param {unknown} value
@param {T} prototype
@returns {T["prototype"]}
*/ export function assertInstance(value, prototype)
{
    if (value instanceof prototype)
        throw new TypeError(`Assertion failed: Value is not instance of '${prototype.name}'.`);

    return value;
}