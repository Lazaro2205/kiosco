const { Schema, model } = require('mongoose');

// Contadores atómicos por empresa (ej: numeración correlativa de ventas).
// Cada empresa tiene su propia secuencia: la venta #1 de una empresa no
// choca con la venta #1 de otra.
const counterSchema = new Schema({
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    key: { type: String, required: true },
    seq: { type: Number, default: 0 }
});

counterSchema.index({ orgId: 1, key: 1 }, { unique: true });

/**
 * Devuelve el próximo número de la secuencia de una empresa, de forma atómica.
 * @param {import('mongoose').Types.ObjectId|string} orgId Empresa dueña de la secuencia.
 * @param {string} key Nombre de la secuencia (ej: 'sale').
 * @param {import('mongoose').ClientSession} [session] Sesión de la transacción.
 * @returns {Promise<number>} El número siguiente.
 */
counterSchema.statics.next = async function (orgId, key, session) {
    const doc = await this.findOneAndUpdate(
        { orgId, key },
        { $inc: { seq: 1 } },
        { new: true, upsert: true, session }
    );
    return doc.seq;
};

module.exports = model('Counter', counterSchema);
