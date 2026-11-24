const { Schema, model } = require('mongoose');

// Catálogo de artículos de una empresa. El precio de venta es final
// (IVA incluido). Las existencias y el costo promedio viven en BranchStock,
// porque son por sucursal.
const articleSchema = new Schema({
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    code: { type: String, required: true, trim: true },
    barcode: { type: String, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    // Referencia a la categoría (antes era el nombre como texto).
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category' },
    unit: { type: String, trim: true, default: 'unidad' },
    salePrice: { type: Number, required: true, min: 0 },
    imageUrl: { type: String, trim: true },
    active: { type: Boolean, default: true }
}, { timestamps: true });

// El código interno no se repite dentro de una empresa.
articleSchema.index({ orgId: 1, code: 1 }, { unique: true });

// El código de barras tampoco se repite dentro de una empresa (el lector
// tiene que encontrar un solo artículo), pero dos empresas pueden tener el
// mismo producto. El índice solo aplica a los artículos que tienen código
// de barras: los que no lo tienen (chicles sueltos, sándwiches) no chocan.
articleSchema.index(
    { orgId: 1, barcode: 1 },
    { unique: true, partialFilterExpression: { barcode: { $type: 'string' } } }
);

articleSchema.index({ orgId: 1, active: 1, name: 1 });
articleSchema.index({ orgId: 1, categoryId: 1 });

module.exports = model('Article', articleSchema);
