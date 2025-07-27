"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeToken = exports.signToken = void 0;
exports.encodeText = encodeText;
exports.decodeText = decodeText;
const env_1 = require("../../env");
const jsonwebtoken_1 = require("jsonwebtoken");
function encodeText(input) {
    if (typeof Buffer !== "undefined") {
        return Buffer.from(input, "utf8").toString("base64");
    }
    const utf8Bytes = encodeURIComponent(input).replace(/%([0-9A-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    return btoa(utf8Bytes);
}
function decodeText(base64) {
    if (typeof Buffer !== "undefined") {
        return Buffer.from(base64, "base64").toString("utf8");
    }
    const binary = atob(base64);
    const percentEncoded = Array.prototype.map
        .call(binary, (char) => {
        const code = char.charCodeAt(0).toString(16).toUpperCase();
        return "%" + (code.length < 2 ? "0" + code : code);
    })
        .join("");
    return decodeURIComponent(percentEncoded);
}
const signToken = (id) => {
    return jsonwebtoken_1.default.sign({ value: id }, env_1.default.JWT_SECRET, {
        expiresIn: env_1.default.JWT_EXPIRES_IN,
    });
};
exports.signToken = signToken;
const decodeToken = (token) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, env_1.default.JWT_SECRET);
        return decoded;
    }
    catch (err) {
        throw new Error("Invalid token");
    }
};
exports.decodeToken = decodeToken;
//# sourceMappingURL=encryption.js.map