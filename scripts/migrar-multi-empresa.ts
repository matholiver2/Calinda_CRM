// Migração única: popula MembroEmpresa/Usuario.superAdmin a partir dos
// campos antigos Usuario.papel/Usuario.empresaId, antes de removê-los do
// schema. Rodar UMA VEZ contra produção (session-pooler), depois do db push
// aditivo (schema atual, com os campos antigos ainda presentes).
import { prisma } from "../src/lib/db";

async function main() {
  const usuarios = await prisma.usuario.findMany();
  console.log(`Encontrados ${usuarios.length} usuários.`);

  let superAdmins = 0;
  let membros = 0;
  let semEmpresa = 0;

  for (const usuario of usuarios) {
    if (usuario.papel === "super_admin") {
      await prisma.usuario.update({ where: { id: usuario.id }, data: { superAdmin: true } });
      superAdmins++;
      continue;
    }
    if (!usuario.empresaId) {
      semEmpresa++;
      console.warn(`Usuário ${usuario.id} (${usuario.email}) sem empresaId e não é super_admin — pulado.`);
      continue;
    }
    await prisma.membroEmpresa.upsert({
      where: { usuarioId_empresaId: { usuarioId: usuario.id, empresaId: usuario.empresaId } },
      create: {
        usuarioId: usuario.id,
        empresaId: usuario.empresaId,
        papel: usuario.papel as "admin" | "gestor" | "vendedor",
        ativo: usuario.ativo,
      },
      update: {},
    });
    membros++;
  }

  console.log(`\nsuper_admin marcados: ${superAdmins}`);
  console.log(`MembroEmpresa criados/confirmados: ${membros}`);
  console.log(`Usuários sem empresaId (pulados): ${semEmpresa}`);
}

main()
  .catch((err) => {
    console.error("ERRO NA MIGRAÇÃO:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
