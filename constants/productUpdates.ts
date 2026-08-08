import { ProductUpdateCatalogSchema, type ProductUpdate } from '@/services/api/schemas/productUpdate.schema';

const catalog = [
  {
    id: 'conversation-first-chat',
    status: 'released',
    publishedAt: '2026-08-06T10:00:00.000Z',
    featured: true,
    actionRoute: '/(tabs)/chat',
    content: {
      'pt-BR': {
        title: 'Suas conversas vêm primeiro',
        summary: 'O Chat agora organiza suas conversas mais recentes para você retomar de onde parou.',
        highlights: [
          'Encontre conversas ativas antes da lista de amigos.',
          'Veja uma prévia clara da última atividade de cada conversa.',
        ],
        actionLabel: 'Ver minhas conversas',
      },
      en: {
        title: 'Your conversations come first',
        summary: 'Chat now organizes your latest conversations so you can pick up where you left off.',
        highlights: [
          'Find active conversations before your friends list.',
          'See a clear preview of each conversation’s latest activity.',
        ],
        actionLabel: 'View my chats',
      },
    },
  },
  {
    id: 'private-notification-previews',
    status: 'improved',
    publishedAt: '2026-08-03T10:00:00.000Z',
    content: {
      'pt-BR': {
        title: 'Notificações mais privadas',
        summary: 'As prévias de gasps nas notificações agora protegem melhor o seu conteúdo.',
        highlights: [
          'A notificação avisa que chegou algo novo sem revelar a mídia.',
          'Você continua abrindo o gasp no app, no momento certo.',
        ],
      },
      en: {
        title: 'More private notifications',
        summary: 'Gasp previews in notifications now better protect your content.',
        highlights: [
          'Notifications let you know something new arrived without showing the media.',
          'You can still open the gasp in the app when the time is right.',
        ],
      },
    },
  },
  {
    id: 'reaction-watermark',
    status: 'improved',
    publishedAt: '2026-07-24T10:00:00.000Z',
    content: {
      'pt-BR': {
        title: 'Reações compartilhadas levam a marca GASP',
        summary: 'Composições de reação salvas agora incluem uma assinatura visual do GASP.',
        highlights: ['A marca aparece de forma discreta no conteúdo compartilhado.'],
      },
      en: {
        title: 'Shared reactions carry the GASP mark',
        summary: 'Saved reaction composites now include a visual GASP signature.',
        highlights: ['The mark appears discreetly on shared content.'],
      },
    },
  },
  {
    id: 'social-notifications',
    status: 'released',
    publishedAt: '2026-07-15T10:00:00.000Z',
    content: {
      'pt-BR': {
        title: 'Fique por dentro sem perder o momento',
        summary: 'O GASP agora avisa sobre mensagens, gasps, reações e pedidos de amizade.',
        highlights: [
          'Receba avisos no app quando estiver usando o GASP.',
          'Toque em uma notificação para ir direto ao contexto certo.',
        ],
      },
      en: {
        title: 'Stay in the moment, stay up to date',
        summary: 'GASP now lets you know about messages, gasps, reactions, and friend requests.',
        highlights: [
          'Receive in-app alerts while you are using GASP.',
          'Tap a notification to go straight to the right context.',
        ],
      },
    },
  },
  {
    id: 'reaction-composite',
    status: 'released',
    publishedAt: '2026-07-01T10:00:00.000Z',
    content: {
      'pt-BR': {
        title: 'Veja a reação junto com o gasp',
        summary: 'As reações agora podem aparecer ao lado do conteúdo que despertou aquele momento.',
        highlights: [
          'Entenda melhor o contexto por trás de cada reação.',
          'Reviva o gasp e a reação em uma única visualização.',
        ],
      },
      en: {
        title: 'See the reaction with the gasp',
        summary: 'Reactions can now appear alongside the content that sparked the moment.',
        highlights: [
          'Understand the context behind every reaction.',
          'Relive the gasp and reaction in a single view.',
        ],
      },
    },
  },
  {
    id: 'gasp-notifications',
    status: 'released',
    publishedAt: '2026-06-23T10:00:00.000Z',
    content: {
      'pt-BR': {
        title: 'Você não perde mais um gasp',
        summary: 'Novos gasps e reações podem chamar sua atenção mesmo quando você está fora do app.',
        highlights: [
          'Veja avisos no celular quando houver algo esperando por você.',
          'Os indicadores do app mostram onde há novidade.',
        ],
      },
      en: {
        title: 'Never miss a gasp',
        summary: 'New gasps and reactions can get your attention even when you are away from the app.',
        highlights: [
          'See phone alerts when something is waiting for you.',
          'In-app indicators show where something new is happening.',
        ],
      },
    },
  },
  {
    id: 'recording-confidence',
    status: 'improved',
    publishedAt: '2026-06-03T10:00:00.000Z',
    content: {
      'pt-BR': {
        title: 'Mais controle ao gravar uma reação',
        summary: 'A gravação ficou mais clara, com contagem regressiva e sinais visuais de tempo.',
        highlights: [
          'Prepare-se com a contagem antes de começar.',
          'Acompanhe o tempo disponível enquanto grava.',
        ],
      },
      en: {
        title: 'More confidence when recording a reaction',
        summary: 'Recording is clearer with a countdown and visual time cues.',
        highlights: [
          'Get ready with a countdown before recording starts.',
          'Keep track of the time available while you record.',
        ],
      },
    },
  },
  {
    id: 'unread-activity',
    status: 'improved',
    publishedAt: '2026-06-01T10:00:00.000Z',
    actionRoute: '/(tabs)/chat',
    content: {
      'pt-BR': {
        title: 'Veja o que precisa da sua atenção',
        summary: 'Indicadores de novidades e conversas recentes ajudam você a encontrar o que aconteceu.',
        highlights: [
          'As conversas mais recentes aparecem primeiro.',
          'As abas de Gasps e Chat mostram quando há algo novo.',
        ],
        actionLabel: 'Abrir conversas',
      },
      en: {
        title: 'See what needs your attention',
        summary: 'New-activity indicators and recent conversations help you find what happened.',
        highlights: [
          'Your most recent conversations appear first.',
          'Gasps and Chat tabs show when something new is waiting.',
        ],
        actionLabel: 'Open chats',
      },
    },
  },
  {
    id: 'share-gasps',
    status: 'released',
    publishedAt: '2026-05-17T10:00:00.000Z',
    actionRoute: '/(tabs)/camera',
    content: {
      'pt-BR': {
        title: 'Compartilhe um gasp com seus amigos',
        summary: 'Depois de criar uma foto ou vídeo, escolha com quem quer dividir o momento.',
        highlights: [
          'Selecione um ou mais amigos antes de enviar.',
          'Acompanhe o envio sem sair da experiência.',
        ],
        actionLabel: 'Criar um gasp',
      },
      en: {
        title: 'Share a gasp with your friends',
        summary: 'After creating a photo or video, choose who to share the moment with.',
        highlights: [
          'Choose one or more friends before sending.',
          'Follow the send without leaving the experience.',
        ],
        actionLabel: 'Create a gasp',
      },
    },
  },
  {
    id: 'camera-controls',
    status: 'released',
    publishedAt: '2026-05-16T10:00:00.000Z',
    actionRoute: '/(tabs)/camera',
    content: {
      'pt-BR': {
        title: 'A câmera ficou mais sua',
        summary: 'Você ganhou mais maneiras de enquadrar, gravar e guardar seus momentos.',
        highlights: [
          'Use zoom por gesto ao gravar.',
          'Reposicione sua câmera de reação e salve conteúdos quando disponível.',
        ],
        actionLabel: 'Abrir câmera',
      },
      en: {
        title: 'The camera feels more like yours',
        summary: 'You have more ways to frame, record, and keep your moments.',
        highlights: [
          'Use pinch zoom while recording.',
          'Reposition your reaction camera and save content when available.',
        ],
        actionLabel: 'Open camera',
      },
    },
  },
  {
    id: 'camera-capture',
    status: 'released',
    publishedAt: '2026-04-11T10:00:00.000Z',
    actionRoute: '/(tabs)/camera',
    content: {
      'pt-BR': {
        title: 'Capture fotos e vídeos no GASP',
        summary: 'A câmera do GASP permite registrar o momento antes de compartilhá-lo.',
        highlights: ['Alterne entre foto e vídeo sem sair do app.'],
        actionLabel: 'Abrir câmera',
      },
      en: {
        title: 'Capture photos and videos in GASP',
        summary: 'The GASP camera lets you capture the moment before you share it.',
        highlights: ['Switch between photos and video without leaving the app.'],
        actionLabel: 'Open camera',
      },
    },
  },
  {
    id: 'discover-people',
    status: 'released',
    publishedAt: '2026-03-30T10:00:00.000Z',
    actionRoute: '/(tabs)/discover',
    content: {
      'pt-BR': {
        title: 'Descubra pessoas para adicionar',
        summary: 'Ficou mais simples encontrar perfis e começar novas conexões no GASP.',
        highlights: [
          'Busque pessoas pelo nome ou @.',
          'Veja sugestões para expandir sua rede.',
        ],
        actionLabel: 'Descobrir pessoas',
      },
      en: {
        title: 'Discover people to add',
        summary: 'It is easier to find profiles and start new connections on GASP.',
        highlights: [
          'Search for people by name or @.',
          'See suggestions to grow your network.',
        ],
        actionLabel: 'Discover people',
      },
    },
  },
  {
    id: 'friends-and-requests',
    status: 'released',
    publishedAt: '2026-03-29T10:00:00.000Z',
    content: {
      'pt-BR': {
        title: 'Acompanhe amigos e pedidos em um só lugar',
        summary: 'A área de Gasps passou a organizar pedidos, gasps recebidos e reações.',
        highlights: [
          'Aceite ou recuse pedidos de amizade com rapidez.',
          'Veja suas atividades recentes separadas por tipo.',
        ],
      },
      en: {
        title: 'Keep friends and requests in one place',
        summary: 'The Gasps area now organizes requests, received gasps, and reactions.',
        highlights: [
          'Accept or decline friend requests quickly.',
          'See your latest activity organized by type.',
        ],
      },
    },
  },
  {
    id: 'friend-profiles',
    status: 'released',
    publishedAt: '2026-03-29T09:00:00.000Z',
    content: {
      'pt-BR': {
        title: 'Conheça melhor seus amigos',
        summary: 'Perfis de amigos mostram informações compartilhadas e ações relevantes.',
        highlights: [
          'Veja conexões em comum.',
          'Gerencie amizade e segurança a partir do perfil.',
        ],
      },
      en: {
        title: 'Get to know your friends better',
        summary: 'Friend profiles show shared information and relevant actions.',
        highlights: [
          'See connections you have in common.',
          'Manage friendship and safety from the profile.',
        ],
      },
    },
  },
  {
    id: 'chat-and-reactions',
    status: 'released',
    publishedAt: '2026-03-26T10:00:00.000Z',
    actionRoute: '/(tabs)/chat',
    content: {
      'pt-BR': {
        title: 'Converse e reaja em um só lugar',
        summary: 'O GASP passou a reunir mensagens, gasps e reações dentro das conversas.',
        highlights: [
          'Envie mensagens para seus amigos.',
          'Abra um gasp e grave uma reação para responder ao momento.',
        ],
        actionLabel: 'Abrir conversas',
      },
      en: {
        title: 'Chat and react in one place',
        summary: 'GASP now brings messages, gasps, and reactions together in conversations.',
        highlights: [
          'Send messages to your friends.',
          'Open a gasp and record a reaction to answer the moment.',
        ],
        actionLabel: 'Open chats',
      },
    },
  },
  {
    id: 'profile-and-settings',
    status: 'released',
    publishedAt: '2026-02-22T10:00:00.000Z',
    actionRoute: '/(tabs)/profile',
    content: {
      'pt-BR': {
        title: 'Seu perfil, do seu jeito',
        summary: 'O perfil e as configurações chegaram para você acompanhar sua atividade e ajustar o app.',
        highlights: [
          'Veja seu GASP Score e sua atividade.',
          'Acesse configurações e controle seus dados locais.',
        ],
        actionLabel: 'Ver meu perfil',
      },
      en: {
        title: 'Your profile, your way',
        summary: 'Profile and settings arrived so you can follow your activity and adjust the app.',
        highlights: [
          'See your GASP Score and activity.',
          'Open settings and manage your local data.',
        ],
        actionLabel: 'View my profile',
      },
    },
  },
  {
    id: 'hold-to-view',
    status: 'released',
    publishedAt: '2026-02-16T10:00:00.000Z',
    content: {
      'pt-BR': {
        title: 'Gasps para viver no momento',
        summary: 'O GASP nasceu com uma forma mais intencional de ver conteúdo e responder com reação.',
        highlights: [
          'Segure para revelar um gasp.',
          'Responda ao momento com uma reação em vídeo.',
        ],
      },
      en: {
        title: 'Gasps made for the moment',
        summary: 'GASP began with a more intentional way to view content and respond with a reaction.',
        highlights: [
          'Hold to reveal a gasp.',
          'Answer the moment with a video reaction.',
        ],
      },
    },
  },
] as const;

export const PRODUCT_UPDATES: ProductUpdate[] = ProductUpdateCatalogSchema.parse(catalog);
