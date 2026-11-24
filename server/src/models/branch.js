const { Schema, model } = require('mongoose');

// Sucursal de una empresa.
const branchSchema = new Schema({
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    name: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    phone: { type: String, trim: true },
    active: { type: Boolean, default: true }
}, { timestamps: true });

// El nombre de la sucursal no se repite dentro de una empresa.
branchSchema.index({ orgId: 1, name: 1 }, { unique: true });

module.exports = model('Branch', branchSchema);
