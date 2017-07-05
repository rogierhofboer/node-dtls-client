"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var TypeSpecs = require("./TypeSpecs");
var util_1 = require("../lib/util");
var BitConverter_1 = require("../lib/BitConverter");
// TODO: support raw buffers in Vector<number>
var Vector = (function () {
    // TODO: this has to be possible without the spec param
    // maybe pass it when serializing?
    function Vector(
        //public spec: TypeSpecs.Vector, 
        items) {
        if (items === void 0) { items = []; }
        this.items = items;
    }
    Vector.prototype.serialize = function (spec) {
        // optional, empty vectors resolve to empty buffers
        if (this.items.length === 0 && spec.optional) {
            return Buffer.allocUnsafe(0);
        }
        // serialize all the items into single buffers
        var serializedItems, bitSize;
        ;
        switch (spec.itemSpec.type) {
            case "number":
            case "enum":
                bitSize = TypeSpecs.getPrimitiveSize(spec.itemSpec);
                //+(spec.itemSpec as (TypeSpecs.Number | TypeSpecs.Enum)).size.substr("uint".length) as BitSizes;
                serializedItems = this.items.map(function (v) { return BitConverter_1.numberToBuffer(v, bitSize); });
                break;
            case "struct":
                serializedItems = this.items.map(function (v) { return v.serialize(); });
        }
        var ret = Buffer.concat(serializedItems);
        // for variable length vectors, prepend the maximum length
        if (TypeSpecs.Vector.isVariableLength(spec)) {
            var lengthBits = (8 * util_1.fitToWholeBytes(spec.maxLength));
            ret = Buffer.concat([
                BitConverter_1.numberToBuffer(ret.length, lengthBits),
                ret
            ]);
        }
        return ret;
    };
    Vector.prototype.deserialize = function (spec, buf, offset) {
        if (offset === void 0) { offset = 0; }
        // for variable length vectors, read the length first
        var length = spec.maxLength;
        var delta = 0;
        if (TypeSpecs.Vector.isVariableLength(spec)) {
            var lengthBits = (8 * util_1.fitToWholeBytes(spec.maxLength));
            length = BitConverter_1.bufferToNumber(buf, lengthBits, offset);
            delta += lengthBits / 8;
        }
        switch (spec.itemSpec.type) {
            case "number":
            case "enum":
                var bitSize = TypeSpecs.getPrimitiveSize(spec.itemSpec);
                for (var i_1 = 0; i_1 < length; i_1 += bitSize / 8) {
                    this.items.push(BitConverter_1.bufferToNumber(buf, bitSize, offset + delta)); // we know this is a number!
                    delta += bitSize / 8;
                }
                break;
            case "struct":
                var i = 0;
                while (i < length) {
                    var item = spec.itemSpec.structType.from(spec.itemSpec, buf, offset + delta);
                    i += item.readBytes;
                    delta += item.readBytes;
                    this.items.push(item.result); // we know this is a struct/ISerializable
                }
        }
        return delta;
    };
    Vector.from = function (spec, buf, offset) {
        var ret = new Vector();
        if (buf.length === 0) {
            if (spec.optional)
                return { result: ret, readBytes: 0 };
            throw new Error("nothing to deserialize");
        }
        else {
            return { result: ret, readBytes: ret.deserialize(spec, buf, offset) };
        }
    };
    Vector.createFromBuffer = function (buf) {
        return new Vector(BitConverter_1.bufferToByteArray(buf));
    };
    return Vector;
}());
exports.Vector = Vector;
//# sourceMappingURL=Vector.js.map