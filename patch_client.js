const fs = require('fs');
const path = require('path');

const clientIndexPath = path.join(__dirname, 'node_modules', '.prisma', 'client', 'index.js');

if (!fs.existsSync(clientIndexPath)) {
    console.error('Prisma client index.js not found at:', clientIndexPath);
    process.exit(1);
}

let content = fs.readFileSync(clientIndexPath, 'utf8');

// 1. Patch runtimeDataModel
const regexModel = /config\.runtimeDataModel = JSON\.parse\("(.*)"\)/;
const matchModel = content.match(regexModel);

if (matchModel) {
    let jsonStr = matchModel[1].replace(/\\"/g, '"');
    let dataModel = JSON.parse(jsonStr);

    if (!dataModel.models.RefreshToken) {
        dataModel.models.RefreshToken = {
            dbName: null,
            fields: [
                { name: 'id', kind: 'scalar', isList: false, isRequired: true, isUnique: false, isId: true, isReadOnly: false, hasDefaultValue: true, type: 'String', default: { name: 'uuid(4)', args: [] }, isGenerated: false, isUpdatedAt: false },
                { name: 'token', kind: 'scalar', isList: false, isRequired: true, isUnique: true, isId: false, isReadOnly: false, hasDefaultValue: false, type: 'String', isGenerated: false, isUpdatedAt: false },
                { name: 'userId', kind: 'scalar', isList: false, isRequired: true, isUnique: false, isId: false, isReadOnly: true, hasDefaultValue: false, type: 'String', isGenerated: false, isUpdatedAt: false },
                { name: 'user', kind: 'object', isList: false, isRequired: true, isUnique: false, isId: false, isReadOnly: false, hasDefaultValue: false, type: 'User', relationName: 'RefreshTokenToUser', relationFromFields: ['userId'], relationToFields: ['id'], isGenerated: false, isUpdatedAt: false },
                { name: 'expiresAt', kind: 'scalar', isList: false, isRequired: true, isUnique: false, isId: false, isReadOnly: false, hasDefaultValue: false, type: 'DateTime', isGenerated: false, isUpdatedAt: false },
                { name: 'revoked', kind: 'scalar', isList: false, isRequired: true, isUnique: false, isId: false, isReadOnly: false, hasDefaultValue: true, type: 'Boolean', default: false, isGenerated: false, isUpdatedAt: false },
                { name: 'createdAt', kind: 'scalar', isList: false, isRequired: true, isUnique: false, isId: false, isReadOnly: false, hasDefaultValue: true, type: 'DateTime', default: { name: 'now', args: [] }, isGenerated: false, isUpdatedAt: false }
            ],
            primaryKey: null, uniqueFields: [], uniqueIndexes: [], isGenerated: false
        };
    }

    if (!dataModel.models.Patient.fields.find(f => f.name === 'mrn')) {
        dataModel.models.Patient.fields.push({ name: 'mrn', kind: 'scalar', isList: false, isRequired: true, isUnique: true, isId: false, isReadOnly: false, hasDefaultValue: false, type: 'String', isGenerated: false, isUpdatedAt: false });
    }

    if (!dataModel.models.Episode.fields.find(f => f.name === 'bedNumber')) {
        dataModel.models.Episode.fields.push({ name: 'bedNumber', kind: 'scalar', isList: false, isRequired: false, isUnique: false, isId: false, isReadOnly: false, hasDefaultValue: false, type: 'String', isGenerated: false, isUpdatedAt: false });
    }

    const newJsonStr = JSON.stringify(dataModel).replace(/"/g, '\\"');
    content = content.replace(regexModel, `config.runtimeDataModel = JSON.parse("${newJsonStr}")`);
}

// 2. Patch ModelName
const regexName = /exports\.Prisma\.ModelName = \{([\s\S]*?)\};/;
content = content.replace(regexName, (match, p1) => {
    if (!p1.includes('RefreshToken')) {
        return `exports.Prisma.ModelName = {${p1},\n  RefreshToken: 'RefreshToken'\n};`;
    }
    return match;
});

// 3. Patch ScalarFieldEnums
if (!content.includes('RefreshTokenScalarFieldEnum')) {
    const enumStr = `\nexports.Prisma.RefreshTokenScalarFieldEnum = {\n  id: 'id',\n  token: 'token',\n  userId: 'userId',\n  expiresAt: 'expiresAt',\n  revoked: 'revoked',\n  createdAt: 'createdAt'\n};\n`;
    content = content.replace(/exports\.Prisma\.PasswordResetScalarFieldEnum = \{[\s\S]*?\};/, (match) => match + enumStr);
}

// Add mrn to PatientScalarFieldEnum
content = content.replace(/exports\.Prisma\.PatientScalarFieldEnum = \{([\s\S]*?)\};/, (match, p1) => {
    if (!p1.includes('mrn')) return `exports.Prisma.PatientScalarFieldEnum = {${p1},\n  mrn: 'mrn'\n};`;
    return match;
});

// Add bedNumber to EpisodeScalarFieldEnum
content = content.replace(/exports\.Prisma\.EpisodeScalarFieldEnum = \{([\s\S]*?)\};/, (match, p1) => {
    if (!p1.includes('bedNumber')) return `exports.Prisma.EpisodeScalarFieldEnum = {${p1},\n  bedNumber: 'bedNumber'\n};`;
    return match;
});

fs.writeFileSync(clientIndexPath, content);
console.log('Successfully patched Prisma client index.js with comprehensive updates');
