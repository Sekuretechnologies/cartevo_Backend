"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statusCodes = void 0;
exports.statusCodes = {
    BAD_ENTRY: 400,
    NOT_AUTHORIZED: 401,
    ERROR: 500,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
};
const success = ({ output, error, message, code }) => {
    let statusCode = 200;
    if (typeof code == 'string') {
        if (exports.statusCodes?.[code]) {
            statusCode = exports.statusCodes?.[code];
        }
    }
    return {
        status: 'success',
        code: statusCode,
        message: message ?? 'Successful operation',
        output,
        error,
    };
};
const error = ({ output, error, message, code }) => {
    let statusCode = 500;
    if (typeof code == 'string') {
        if (exports.statusCodes?.[code]) {
            statusCode = exports.statusCodes?.[code];
        }
    }
    else if (typeof code == 'number') {
        statusCode = code;
    }
    return {
        status: 'error',
        code: statusCode,
        message: message ?? 'Something went wrong',
        output,
        error,
    };
};
const fnOutput = {
    success,
    error,
};
exports.default = fnOutput;
//# sourceMappingURL=fnOutputHandler.js.map