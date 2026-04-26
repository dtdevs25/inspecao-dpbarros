export interface ChecklistItem {
  id: string;       // ex: "1.1"
  text: string;     // Descrição da pergunta
}

export interface ChecklistCategory {
  id: string;       // ex: "1.0"
  title: string;    // ex: "Disposições Gerais"
  items: ChecklistItem[];
}

export const TECHNICAL_CHECKLIST: ChecklistCategory[] = [
  {
    id: '1.0',
    title: 'Disposições Gerais',
    items: [
      { id: '1.1', text: 'Houve a comunicação prévia à DRT' },
      { id: '1.2', text: 'Foram elaborados o inventário de risco e PGR conforme a NR 01 GRO' },
      { id: '1.3', text: 'Foram elaborados as ordens de serviço sobre segurança e medicina do trabalho' },
      { id: '1.4', text: 'Foi dado ciência de suas ordens de serviço aos empregados' },
      { id: '1.5', text: 'O dimensionamento do SESMT está baseado nas cláusulas contratuais e NR 04' },
      { id: '1.6', text: 'A composição CIPA está Conforme a NR 05' },
      { id: '1.7', text: 'A CIPA elaborou e divulgou o mapa de risco' },
      { id: '1.8', text: 'O mapa de risco está visível no canteiro / frentes de trabalho' },
      { id: '1.9', text: 'É mantido na obra o prontuário de todos os funcionários (Ficha de registro, ASO, Treinamentos de Segurança e Fichas de EPI)' },
      { id: '1.10', text: 'A obra está limpa e organizada, sem armazenamento irregular de entulhos' },
    ],
  },
  {
    id: '2.0',
    title: "EPI's – Equipamento de Proteção Individual",
    items: [
      { id: '2.1', text: 'Utilização adequada para função e atividade (Checar todas as frentes de serviço)' },
      { id: '2.2', text: 'Boas condições de uso e higienização' },
      { id: '2.3', text: 'Fichas de EPI com CA e atualizada' },
      { id: '2.4', text: 'Recebeu o treinamento quanto ao uso e guarda do EPI' },
      { id: '2.5', text: "Estoque de EPI's no canteiro de obra" },
    ],
  },
  {
    id: '3.0',
    title: "EPC's – Equipamento de Proteção Coletiva",
    items: [
      { id: '3.1', text: 'Sinalização: cavaletes, placas de sinalização, fita zebrada, cones de sinalização / iluminação noturna' },
      { id: '3.2', text: 'Isolamentos da área de trabalho: Guarda Corpo, Tapumes (madeirite, chapa, metálica ou telas de proteção) e barreira de concreto' },
      { id: '3.3', text: 'Transporte de materiais: cabos de aço, cinta de poliéster, corda de poliamida' },
      { id: '3.4', text: 'Armazenamento de materiais' },
      { id: '3.5', text: 'Vergalhões devidamente tampados' },
      { id: '3.6', text: 'Há o fornecimento e registro mensal em ficha da entrega de protetor solar e luva química' },
    ],
  },
  {
    id: '4.0',
    title: 'Treinamentos',
    items: [
      { id: '4.1', text: 'O treinamento admissional possui carga horária mínima de 4 (quatro) horas' },
      { id: '4.2', text: 'DDS – Diálogo Diário de Segurança está sendo realizado' },
      { id: '4.3', text: 'Treinamento específico (Ex: eletricista, operador de retroescavadeira, entre outros)' },
      { id: '4.4', text: 'Treinamento de NR10 Segurança Em Instalações e Serviços Em Eletricidade' },
      { id: '4.5', text: 'Treinamento de NR23 Primeiros Socorros, Brigadista' },
      { id: '4.6', text: 'Treinamento de NR33 Espaço Confinado' },
      { id: '4.7', text: 'Treinamento de NR35 de Trabalho em Altura' },
    ],
  },
  {
    id: '5.0',
    title: 'Equipamentos Pesados (Veículos): Retroescavadeira, Escavadeira Hidráulica, Caminhão, etc.',
    items: [
      { id: '5.1', text: 'Estão sendo realizados Check List para todas as Máquinas?' },
      { id: '5.2', text: 'Condição externa e interna: alarme de ré, retrovisores, pneus, extintor, cinto de segurança, assentos, carcaça e freios' },
      { id: '5.3', text: 'Operador habilitado conforme o código de trânsito' },
      { id: '5.4', text: 'Operador qualificado conforme NR12' },
      { id: '5.5', text: 'Vazamento de óleo combustível' },
    ],
  },
  {
    id: '6.0',
    title: 'Documentação de Segurança conforme o Programa de Gestão de Segurança',
    items: [
      { id: '6.1', text: 'PGR de acordo com a obra e conforme a NR9' },
      { id: '6.2', text: 'PCMSO de acordo com a obra e conforme NR7' },
      { id: '6.3', text: 'PAE – Procedimento de Atendimento Emergencial' },
      { id: '6.4', text: 'O PAE foi divulgado e está disponível no canteiro / frentes de trabalho' },
      { id: '6.5', text: 'Análise Preliminar de Risco conforme as atividades / etapas de serviços' },
      { id: '6.6', text: 'Check List de Equipamentos' },
      { id: '6.7', text: 'Documentos de Funcionários registrados' },
      { id: '6.8', text: 'Procedimento de Trabalho PET, PT entre outros' },
      { id: '6.9', text: 'Consta à disposição da fiscalização e órgãos competentes no canteiro os documentos elencados acima' },
      { id: '6.10', text: 'FDS (Ficha de Dados de Segurança) dos produtos químicos utilizados, disponíveis na obra' },
      { id: '6.11', text: 'Certificados de Aprovação dos EPIs (CA) - Válido' },
      { id: '6.12', text: 'Relações dos EPI e suas respectivas especificações técnicas, de acordo com os riscos ocupacionais existentes' },
      { id: '6.13', text: 'Projetos da área de vivência do canteiro de obras, elaborado por profissional legalmente habilitado' },
      { id: '6.14', text: 'Projeto elétrico das instalações temporárias, elaborado por profissional legalmente habilitado' },
      { id: '6.15', text: 'Projetos dos sistemas de proteção coletiva elaborados por profissional legalmente habilitado' },
      { id: '6.16', text: 'Projetos dos Sistemas de Proteção Individual Contra Quedas (SPIQ), elaborados por profissional legalmente habilitado' },
      { id: '6.17', text: 'As empresas contratadas forneceram ao contratante o inventário de riscos ocupacionais específicos de suas atividades' },
    ],
  },
  {
    id: '7.0',
    title: 'Equipamentos Elétricos, Pneumáticos ou à Diesel (Serra, Furadeiras, Betoneiras, Geradores, etc.)',
    items: [
      { id: '7.1', text: 'Condição externa: Proteção de partes móveis e carcaça' },
      { id: '7.2', text: 'Isolamento e conexão elétrica' },
      { id: '7.3', text: 'A contratada realiza o Check List do Equipamento' },
      { id: '7.4', text: 'Isolamento de chaves e cabos' },
      { id: '7.5', text: 'Sinalização' },
      { id: '7.6', text: 'Proteção / Barreiras' },
      { id: '7.7', text: 'Vazamento de óleo e combustível' },
      { id: '7.8', text: 'Aterramento' },
      { id: '7.9', text: 'Extintor de Incêndio no prazo de validade' },
    ],
  },
  {
    id: '8.0',
    title: 'Instalação do Canteiro de Obras – Área de Vivência',
    items: [
      { id: '8.1', text: 'Almoxarifado' },
      { id: '8.2', text: 'Refeitório com número de mesas e cadeiras suficiente' },
      { id: '8.3', text: 'Ventilação natural ou artificial suficiente no refeitório' },
      { id: '8.4', text: 'Foi realizado o controle e vigilância da qualidade da água dos bebedouros e caixa d\'água' },
      { id: '8.5', text: 'Sanitários em número suficiente' },
      { id: '8.6', text: 'Chuveiros em número suficiente e com piso de plástico lavável' },
      { id: '8.7', text: 'Containers com aterramento e laudo elétrico' },
      { id: '8.8', text: 'Escritórios' },
      { id: '8.9', text: 'Dimensionamento de Extintor' },
      { id: '8.10', text: 'Kit de Primeiros Socorros' },
      { id: '8.11', text: 'Foram instaladas placas de sinalização e advertência de segurança do trabalho' },
      { id: '8.12', text: 'Vestiários com armários e bancos em número suficiente' },
      { id: '8.13', text: 'O protetor solar e luva química estão à disposição para utilização dos colaboradores em área visível' },
    ],
  },
  {
    id: '9.0',
    title: 'Instalações de Área de Vivência – Via Pública',
    items: [
      { id: '9.1', text: 'Foram realizados o controle e vigilância da qualidade da água dos bebedouros e caixa d\'água' },
      { id: '9.2', text: 'Garrafas térmicas para fornecimento de água potável, filtrada e fresca, incluindo copos descartáveis' },
      { id: '9.3', text: 'Mesas e assentos de acordo com o número de funcionários' },
      { id: '9.4', text: 'Kits de Higienização para mãos (sabão líquido, papel toalha, álcool em gel)' },
      { id: '9.5', text: 'Banheiro Químico' },
      { id: '9.6', text: 'Proteções contra intempéries (tenda)' },
      { id: '9.7', text: 'Kit de Primeiros Socorros' },
      { id: '9.8', text: 'Extintor de incêndio' },
      { id: '9.9', text: 'Isolamento da área de vivência' },
      { id: '9.10', text: 'Lixeiras' },
    ],
  },
  {
    id: '10.0',
    title: 'Refeição dos Colaboradores',
    items: [
      { id: '10.1', text: 'Há relatos de intoxicação alimentar dos colaboradores que recebem a marmita?' },
      { id: '10.2', text: 'Os colaboradores que não almoçam no canteiro central têm área de vivência para fazer a refeição?' },
      { id: '10.3', text: 'Foi feita pesquisa de satisfação de refeição nos últimos 12 meses' },
    ],
  },
  {
    id: '11.0',
    title: 'Transportes de Trabalhadores',
    items: [
      { id: '11.1', text: 'Feito de forma adequada' },
      { id: '11.2', text: 'Condições externas e internas: alarme de ré, retrovisores, pneus, extintor, cinto de segurança, assentos, carcaça, freios' },
      { id: '11.3', text: 'Manutenção Preventiva' },
      { id: '11.4', text: 'Condutor habilitado conforme o código de trânsito' },
      { id: '11.5', text: 'Vazamento de óleo e combustível' },
      { id: '11.6', text: 'O Check List do equipamento é realizado' },
    ],
  },
  {
    id: '12.0',
    title: 'Escoramento de Valas',
    items: [
      { id: '12.1', text: 'Escoramento condizente com o projeto / liberação de execução de escavação' },
      { id: '12.2', text: 'Metodologia executiva adequada' },
      { id: '12.3', text: 'Escoramento encontra-se de acordo com o padrão definido (material, dimensional e posicionamento)' },
      { id: '12.4', text: 'Existência de escadas em boas condições de uso na vala, próximo aos trabalhadores' },
      { id: '12.5', text: 'Disposição de material escavado > 1.0 m da vala escavada, independente do volume' },
      { id: '12.6', text: 'Os funcionários envolvidos nas atividades possuem Treinamento' },
      { id: '12.7', text: 'O formulário de escavação de vala está preenchido' },
    ],
  },
  {
    id: '13.0',
    title: 'Trabalhos de Solda em Tubulações',
    items: [
      { id: '13.1', text: 'Ventilação adequada natural/artificial' },
      { id: '13.2', text: 'Iluminação em 24 volts' },
      { id: '13.3', text: 'Utilização de máscara contra fumos metálicos apropriada' },
      { id: '13.4', text: 'Utilização de avental de raspa, mangote, perneira, Jaleco' },
      { id: '13.5', text: 'Utilização de máscara de solda com proteção de radiação não ionizante' },
      { id: '13.6', text: 'O funcionário tem treinamento para desempenhar a função' },
      { id: '13.7', text: 'Extintor de Incêndio junto com o conjunto oxicorte' },
      { id: '13.8', text: 'O equipamento de solda possui aterramento' },
      { id: '13.9', text: 'Cabos estão em condições de uso' },
    ],
  },
  {
    id: '14.0',
    title: 'Trabalhos Subterrâneos e em Espaços Confinados',
    items: [
      { id: '14.1', text: 'Existem trabalhos subterrâneos e em espaços confinados?' },
      { id: '14.2', text: 'A permissão de entrada em espaço confinado está devidamente preenchida e encontra-se na frente de serviço' },
      { id: '14.3', text: 'Constam os procedimentos obrigatórios conforme a NR33' },
      { id: '14.4', text: 'Todos os envolvidos possuem Treinamentos de Espaço Confinado atualizado' },
      { id: '14.5', text: 'É feita aferição constante de gases no espaço confinado' },
      { id: '14.6', text: 'Existe sistema de ventilação autônomo para a troca de ar atmosférico com o espaço confinado' },
    ],
  },
  {
    id: '15.0',
    title: 'Trabalhos em Altura',
    items: [
      { id: '15.1', text: 'Existem trabalhos em altura?' },
      { id: '15.2', text: 'A permissão de Trabalho em Altura está devidamente preenchida e encontra-se na frente de serviço' },
      { id: '15.3', text: 'Constam os procedimentos obrigatórios conforme NR35' },
      { id: '15.4', text: 'Todos os envolvidos possuem Treinamentos de Trabalho em Altura atualizado' },
    ],
  },
  {
    id: '16.0',
    title: 'Armazenamento de Produtos Químicos',
    items: [
      { id: '16.1', text: 'As fichas FDS (Ficha de Dados de Segurança) dos produtos químicos estão disponíveis no canteiro' },
      { id: '16.2', text: 'Os produtos químicos estão armazenados conforme prevê a NBR 17.505/15, NR 20, NR26 (local seco, coberto, ventilado, com piso impermeabilizado e bacia de contenção)' },
      { id: '16.3', text: 'Foi feito o inventário de produtos químicos' },
      { id: '16.4', text: 'Há sinalização e dispositivos de emergência (extintor, kit de mitigação)' },
      { id: '16.5', text: 'Existe armazenamento de combustível (Gasolina ou Diesel) na obra?' },
    ],
  },
  {
    id: '17.0',
    title: 'Trabalhos em Áreas Alagadas',
    items: [
      { id: '17.1', text: 'Existem trabalhos em áreas alagadas com umidade?' },
      { id: '17.2', text: 'Foi elaborado APR contemplando as atividades' },
      { id: '17.3', text: 'Constam os procedimentos de segurança para realização das atividades' },
      { id: '17.4', text: 'Os EPIs estão em acordo com os riscos descritos na APR e no inventário de risco' },
    ],
  },
  {
    id: '18.0',
    title: 'Trabalhos de Pavimentação',
    items: [
      { id: '18.1', text: 'Existem trabalhos de pavimentação asfáltica?' },
      { id: '18.2', text: 'Foi elaborado APR contemplando as atividades' },
      { id: '18.3', text: 'Constam os procedimentos de segurança para realização das atividades' },
      { id: '18.4', text: 'Os EPIs estão em acordo com os riscos descritos na APR e no inventário de risco' },
      { id: '18.5', text: 'Os colaboradores fazem o uso dos EPIs obrigatórios (Bota com proteção térmica, máscara PFF2, Luvas de PVC, Luva Volk, além do protetor auricular)' },
    ],
  },
  {
    id: '19.0',
    title: 'Alojamento',
    items: [
      { id: '19.1', text: 'Cobertura contra intempéries' },
      { id: '19.2', text: 'Piso e paredes em material resistente' },
      { id: '19.3', text: 'Iluminação e ventilação adequadas' },
      { id: '19.4', text: 'Beliches com escada e proteção lateral' },
      { id: '19.5', text: 'Colchões com densidade 26' },
      { id: '19.6', text: 'Lençol, fronha e travesseiro' },
      { id: '19.7', text: 'Armários individuais dotados de cadeado' },
      { id: '19.8', text: 'Água potável, filtrada e fresca' },
      { id: '19.9', text: 'O Gás GLP está instalado na área externa da casa' },
    ],
  },
  {
    id: '20.0',
    title: 'Guaritas dos Controladores de Acesso',
    items: [
      { id: '20.1', text: 'A guarita possui boas condições de conservação' },
      { id: '20.2', text: 'Possui iluminação e fiação protegidas e aterradas' },
      { id: '20.3', text: 'Possui assento com conforto ergonômico' },
      { id: '20.4', text: 'Possui banheiro próximo, aberto no período noturno para utilização' },
      { id: '20.5', text: 'Possui refeitório com micro-ondas ou marmiteiro aberto no período noturno' },
      { id: '20.6', text: 'O controlador de acesso tem contato com equipamentos energizados?' },
      { id: '20.7', text: 'O controlador de acesso faz o acionamento de bombas ou similares?' },
    ],
  },
  {
    id: '21.0',
    title: 'Abastecimento dos Maquinários',
    items: [
      { id: '21.1', text: 'Existe armazenamento de combustível (Gasolina ou Diesel) na obra?' },
      { id: '21.2', text: 'O abastecimento, realizado pelo comboio, é feito com isolamento de 7,5m da área' },
      { id: '21.3', text: 'A obra possui kit de mitigação (KPA – Kit de Proteção Ambiental)' },
      { id: '21.4', text: 'Há plano de emergência e telefones de contato caso necessário' },
      { id: '21.5', text: 'O abastecedor é habilitado, treinado e autorizado a realizar a atividade' },
    ],
  },
  {
    id: '22.0',
    title: 'Condições Adequadas de Trabalho para o Técnico (SESMT)',
    items: [
      { id: '22.1', text: 'O quadro do SESMT está dimensionado de acordo com a NR 04 e a quantidade de funcionários' },
      { id: '22.2', text: 'Existe uma sala para equipe de Segurança do Trabalho' },
      { id: '22.3', text: 'A equipe de SST tem um equipamento para imprimir e scanner documentos' },
      { id: '22.4', text: 'A equipe dispõe de um computador para elaboração de documentação obrigatória' },
      { id: '22.5', text: 'O profissional de SST dispõe de um auxiliar para atividades de ordem administrativas' },
      { id: '22.6', text: 'A equipe de SST dispõe de um aparelho de celular para comunicação e registros fotográficos' },
      { id: '22.7', text: 'Estoques de EPI em acordo com o efetivo da obra' },
      { id: '22.8', text: 'Dispositivos de segurança: Placas, telas de sinalização, fita zebrada, cones e demais dispositivos de trabalho do setor SST' },
      { id: '22.9', text: 'A equipe de SST participa das tomadas de decisões e planejamento das atividades da obra' },
    ],
  },
  {
    id: '23.0',
    title: 'Instalações Elétricas – Conforme NR-18 e NR-10',
    items: [
      { id: '23.1', text: 'Quadros de distribuição estão sinalizados e identificados quanto ao risco elétrico? (NR-18.6.10, NR-10.2.4)' },
      { id: '23.2', text: 'Todos os circuitos elétricos estão devidamente identificados nos quadros? (NR-18.6.10 "h")' },
      { id: '23.3', text: 'Quadros de distribuição estão com acesso desobstruído e com espaço suficiente para operação e manutenção? (NR-18.6.10 "d" e "e")' },
      { id: '23.4', text: 'Partes vivas dos quadros estão inacessíveis a trabalhadores não autorizados? (NR-18.6.10 "c" e NR-10.2.7)' },
      { id: '23.5', text: 'Existe proteção contra contatos diretos e indiretos (isolamento, aterramento, etc.)? (NR-10.2.8, NR-10.4)' },
      { id: '23.6', text: 'Os condutores estão em bom estado, corretamente isolados e dimensionados para a carga? (NR-10.2.1 e NR-18.6.4)' },
      { id: '23.7', text: 'As instalações possuem sistema de aterramento eficiente, com continuidade elétrica assegurada? (NR-10.4.3 e NR-18.6.3)' },
      { id: '23.8', text: 'Existe sinalização de segurança nas áreas com risco de choque elétrico? (NR-10.2.4, NR-18.6.9)' },
      { id: '23.9', text: 'Somente trabalhadores autorizados e capacitados atuam em serviços elétricos, com uso de EPIs adequados? (NR-10.8 e NR-10.10)' },
      { id: '23.10', text: 'Existe laudo técnico sobre o SPDA (Sistema de Proteção contra Descargas Atmosféricas) do canteiro de obras? (NR-18.6.18 / NBR 5419-3)' },
    ],
  },
  {
    id: '24.0',
    title: 'Escavação, Fundação e Desmonte de Rocha (NR-18)',
    items: [
      { id: '24.1', text: 'Existe projeto de escavação, fundação e desmonte de rochas elaborado por profissional legalmente habilitado? (NR-18.7.2.1)' },
      { id: '24.2', text: 'As escavações com profundidade superior a 1,25 m estão protegidas com taludes ou escoramentos conforme projeto técnico? (NR-18.7.2.8)' },
      { id: '24.3', text: 'As escavações profundas possuem escadas ou rampas próximas aos postos de trabalho para evacuação de emergência? (NR-18.7.2.8)' },
      { id: '24.4', text: 'As escavações são previamente avaliadas quanto à presença de redes subterrâneas (elétricas, hidráulicas, gás, etc.)?' },
    ],
  },
];

// Flatten all items for easy access
export const ALL_CHECKLIST_ITEMS: ChecklistItem[] = TECHNICAL_CHECKLIST.flatMap(cat =>
  cat.items.map(item => ({ ...item, categoryId: cat.id, categoryTitle: cat.title }))
);

export type ChecklistAnswer = 'C' | 'NC' | 'NA' | '';
export type ChecklistAnswers = Record<string, ChecklistAnswer>;

export const DEFAULT_CHECKLIST_ANSWERS: ChecklistAnswers = Object.fromEntries(
  ALL_CHECKLIST_ITEMS.map(item => [item.id, 'C'])
);
