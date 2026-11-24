// Punto único de importación de modelos. Todas las empresas comparten una
// sola base de datos: cada documento lleva su orgId y cada consulta tiene
// que filtrar por él (ver docs/decisiones, decisión 1).
module.exports = {
    Organization: require('./organization'),
    Branch: require('./branch'),
    User: require('./user'),
    Article: require('./article'),
    BranchStock: require('./branchStock'),
    CashSession: require('./cashSession'),
    Sale: require('./sale'),
    Supplier: require('./supplier'),
    Purchase: require('./purchase'),
    Note: require('./note'),
    LedgerEntry: require('./ledgerEntry'),
    Counter: require('./counter'),
    Category: require('./category')
};
