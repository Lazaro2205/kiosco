// Lógica de seed reutilizable: la usa `npm run seed` (contra Atlas) y el
// modo memoria de desarrollo (auto-seed al arrancar sin MONGODB_URI).
//
// Versión provisoria de la tarjeta 1.1: carga el stock inicial directo en
// BranchStock porque purchase.service todavía no guarda orgId. La tarjeta
// 1.4 lo vuelve a hacer con una compra real (stock + costo promedio + asiento).
const bcrypt = require('bcrypt');
const { Organization, Branch, User, Category, Article, BranchStock } = require('../models');

async function seedDemo() {
    const existente = await Organization.findOne({ code: 'DEMO01' });
    if (existente) return false;

    const org = await Organization.create({
        adminId: 'demo_admin', name: 'Kiosco Demo', code: 'DEMO01', ownerClerkId: 'demo_owner_sin_clerk'
    });
    const orgId = org._id;

    const [central, norte] = await Branch.create([
        { orgId, name: 'Sucursal Centro', address: 'San Martín 123' },
        { orgId, name: 'Sucursal Norte', address: 'Av. Libertad 456' }
    ]);

    await User.create([
        {
            orgId, username: 'juan', name: 'Juan Pérez',
            passwordHash: await bcrypt.hash('1234', 10),
            branchIds: [central._id]                       // una sucursal → asignación automática
        },
        {
            orgId, username: 'maria', name: 'María López',
            passwordHash: await bcrypt.hash('1234', 10),
            branchIds: [central._id, norte._id]            // dos sucursales → elige al loguear
        }
    ]);

    const [bebidas, golosinas, snacks] = await Category.create([
        { orgId, name: 'Bebidas' },
        { orgId, name: 'Golosinas' },
        { orgId, name: 'Snacks' }
    ]);

    const articulos = await Article.create([
        { orgId, code: 'A001', barcode: '7790001000011', name: 'Coca Cola 500ml', categoryId: bebidas._id, salePrice: 1800 },
        { orgId, code: 'A002', barcode: '7790001000028', name: 'Alfajor Guaymallén', categoryId: golosinas._id, salePrice: 800 },
        { orgId, code: 'A003', barcode: '7790001000035', name: 'Papas Lays 85g', categoryId: snacks._id, salePrice: 2500 },
        { orgId, code: 'A004', name: 'Chicles Beldent', categoryId: golosinas._id, salePrice: 900 }
    ]);

    // Stock inicial en Centro con su costo (lo que haría una compra).
    const iniciales = [
        { quantity: 24, avgCost: 1100 },
        { quantity: 50, avgCost: 450 },
        { quantity: 30, avgCost: 1600 },
        { quantity: 40, avgCost: 500 }
    ];
    await BranchStock.create(articulos.map((art, i) => ({
        orgId, branchId: central._id, articleId: art._id, ...iniciales[i]
    })));

    console.log('🌱 Datos demo: empresa DEMO01 — operarios juan/1234 (Centro) y maria/1234 (Centro+Norte)');
    return true;
}

module.exports = { seedDemo };
