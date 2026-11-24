const { Schema, model } = require('mongoose');

// Categoría de artículos del negocio. Almacena configuración por categoría,
// como si el lote y la fecha de vencimiento son obligatorios al cargar compras.
const categorySchema = new Schema({
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    name: { type: String, required: true, trim: true },
    requiereVencimiento: { type: Boolean, default: false },
    active: { type: Boolean, default: true }
}, { timestamps: true });

// El nombre de la categoría no se repite dentro de una empresa.
categorySchema.index({ orgId: 1, name: 1 }, { unique: true });

module.exports = model('Category', categorySchema);
