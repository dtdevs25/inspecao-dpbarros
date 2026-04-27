const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const TECHNICAL_CHECKLIST = [
  {
    id: '1.0',
    title: 'Disposições Gerais',
    items: [
      { id: '1.1', text: 'Houve a comunicação prévia à Secretaria do Trabalho, por meio de sistema informatizado próprio, antes do início das atividades?' },
      { id: '1.2', text: 'Foram elaborados o inventário de riscos e o Programa de Gerenciamento de Riscos (PGR)?' },
      { id: '1.3', text: 'O PGR está atualizado de acordo com as etapas da obra?' },
      { id: '1.4', text: 'As frentes de trabalho possuem áreas de vivência adequadas (instalações sanitárias, local para refeições, vestiário, local para descanso)?' },
      { id: '1.5', text: 'O local para refeições é limpo, arejado, possui piso lavável e é independente das instalações sanitárias?' },
      { id: '1.6', text: 'Há fornecimento de água potável, filtrada e fresca aos trabalhadores em locais de fácil acesso?' },
      { id: '1.7', text: 'Os trabalhadores utilizam os Equipamentos de Proteção Individual (EPI) adequados aos riscos?' },
      { id: '1.8', text: 'Há treinamento admissional e periódico sobre segurança do trabalho para todos os colaboradores?' },
      { id: '1.9', text: 'Existe um sistema de proteção coletiva contra quedas (guarda-corpo, rodapé, redes) onde há risco de queda de altura?' },
      { id: '1.10', text: 'As aberturas no piso possuem fechamento provisório resistente e fixo?' }
    ]
  },
  {
    id: '2.0',
    title: 'Instalações Elétricas',
    items: [
      { id: '2.1', text: 'As instalações elétricas provisórias possuem dispositivos de proteção contra choque elétrico (DR)?' },
      { id: '2.2', text: 'Os quadros de distribuição estão trancados, sinalizados e em bom estado de conservação?' },
      { id: '2.3', text: 'A fiação elétrica está suspensa e protegida contra impactos mecânicos e umidade?' },
      { id: '2.4', text: 'As ferramentas elétricas manuais possuem isolamento duplo ou reforçado?' },
      { id: '2.5', text: 'Há aterramento elétrico em todas as máquinas e equipamentos que o exijam?' }
    ]
  },
  {
    id: '3.0',
    title: 'Escavações, Fundações e Desmonte de Rochas',
    items: [
      { id: '3.1', text: 'As escavações com profundidade superior a 1,25m possuem taludes ou escoramentos projetados por profissional habilitado?' },
      { id: '3.2', text: 'Há sinalização de advertência e isolamento ao ao redor das escavações?' },
      { id: '3.3', text: 'O material retirado da escavação é depositado a uma distância segura da borda (mínimo metade da profundidade)?' },
      { id: '3.4', text: 'Há escadas ou rampas de acesso seguras para entrada e saída de trabalhadores nas valas?' }
    ]
  },
  {
    id: '4.0',
    title: 'Carpintaria e Armação',
    items: [
      { id: '4.1', text: 'A serra circular de bancada possui coifa protetora do disco, cutelo divisor e guia de alinhamento?' },
      { id: '4.2', text: 'A área da carpintaria possui piso resistente, nivelado e antiderrapante?' },
      { id: '4.3', text: 'As pontas dos vergalhões de aço estão protegidas para evitar acidentes por perfuração?' },
      { id: '4.4', text: 'As bancadas de armação possuem altura adequada e estão estáveis?' }
    ]
  },
  {
    id: '5.0',
    title: 'Estruturas de Concreto e Metálicas',
    items: [
      { id: '5.1', text: 'As fôrmas e escoramentos foram projetados e conferidos antes da concretagem?' },
      { id: '5.2', text: 'Há isolamento da área abaixo da projeção de montagem de estruturas metálicas?' },
      { id: '5.3', text: 'Os trabalhadores em montagem de estruturas utilizam cinto de segurança tipo paraquedista com talabarte duplo?' }
    ]
  },
  {
    id: '6.0',
    title: 'Andaimes e Plataformas de Trabalho',
    items: [
      { id: '6.1', text: 'Os andaimes estão apoiados sobre sapatas ou bases sólidas e niveladas?' },
      { id: '6.2', text: 'O piso de trabalho dos andaimes é completo, sem vãos, antiderrapante e fixado de forma segura?' },
      { id: '6.3', text: 'Os andaimes possuem guarda-corpo e rodapé em todo o perímetro?' },
      { id: '6.4', text: 'A escada de acesso ao andaime é segura e integrada à estrutura ou fixada nela?' },
      { id: '6.5', text: 'Andaimes móveis possuem travas nas rodas?' }
    ]
  },
  {
    id: '7.0',
    title: 'Sinalização e Ordem/Limpeza',
    items: [
      { id: '7.1', text: 'A obra possui sinalização de segurança visível (uso de EPI, riscos de queda, saída de emergência)?' },
      { id: '7.2', text: 'As passagens e vias de circulação estão desobstruídas?' },
      { id: '7.3', text: 'O entulho é removido regularmente e não há acúmulo de materiais desnecessários?' },
      { id: '7.4', text: 'Há extintores de incêndio carregados, sinalizados e dentro do prazo de validade em locais estratégicos?' }
    ]
  }
];

async function main() {
  console.log('Seeding checklist categories and items...');

  for (let i = 0; i < TECHNICAL_CHECKLIST.length; i++) {
    const cat = TECHNICAL_CHECKLIST[i];
    
    const category = await prisma.checklistCategory.upsert({
      where: { code: cat.id },
      update: { title: cat.title, order: i },
      create: { code: cat.id, title: cat.title, order: i }
    });

    console.log(`- Category: ${cat.id} ${cat.title}`);

    for (let j = 0; j < cat.items.length; j++) {
      const item = cat.items[j];
      
      const existingItem = await prisma.checklistItem.findFirst({
        where: { code: item.id, categoryId: category.id }
      });

      if (existingItem) {
        await prisma.checklistItem.update({
          where: { id: existingItem.id },
          data: { text: item.text, order: j }
        });
      } else {
        await prisma.checklistItem.create({
          data: {
            categoryId: category.id,
            code: item.id,
            text: item.text,
            order: j
          }
        });
      }
    }
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
